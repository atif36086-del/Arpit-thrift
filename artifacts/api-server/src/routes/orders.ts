import { Router } from "express";
import { db, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendNewOrderPush } from "./push";
import { AuthenticatedRequest, authMiddleware, adminMiddleware } from "../middlewares/auth";

const router = Router();

function generateOrderId(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `AT-${num}`;
}

function formatOrder(o: any) {
  return {
    ...o,
    totalAmount: parseFloat(o.totalAmount),
    items: typeof o.items === "string" ? JSON.parse(o.items) : o.items,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt,
  };
}

// GET /api/orders - List all orders (admin only)
router.get("/", authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { status } = req.query as Record<string, string>;
    let orders;

    if (status) {
      orders = await db.select().from(ordersTable).where(eq(ordersTable.status, status));
    } else {
      orders = await db.select().from(ordersTable);
    }

    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    logger.info(
      { userId: req.user?.id, orderCount: orders.length, status },
      "Orders listed"
    );

    res.json(orders.map(formatOrder));
  } catch (err) {
    logger.error({ err }, "Error listing orders");
    res.status(500).json({ error: "Failed to list orders" });
  }
});

// POST /api/orders - Create a new order
router.post("/", async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      address,
      city,
      state,
      pincode,
      items,
      totalAmount,
      notes,
    } = req.body;

    if (!fullName || !email || !phone || !address || !city || !state || !pincode || !items || !totalAmount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const orderId = generateOrderId();

    const [order] = await db
      .insert(ordersTable)
      .values({
        orderId,
        fullName,
        email,
        phone,
        address,
        city,
        state,
        pincode,
        items: JSON.stringify(items),
        totalAmount: String(totalAmount),
        status: "pending_payment",
        notes,
        paymentStatus: "pending",
        inventoryDeducted: false,
      })
      .returning();

    sendNewOrderPush(orderId, fullName, String(totalAmount)).catch((err) => {
      logger.warn({ err, orderId }, "Failed to send push notification");
    });

    logger.info(
      { orderId: order.orderId, id: order.id, totalAmount },
      "Order created"
    );

    res.status(201).json(formatOrder(order));
  } catch (err) {
    logger.error({ err }, "Error creating order");
    res.status(500).json({ error: "Failed to create order" });
  }
});

// GET /api/orders/:id - Get order details
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id));

    if (!order) return res.status(404).json({ error: "Order not found" });

    logger.info({ orderId: order.orderId, id }, "Order retrieved");
    res.json(formatOrder(order));
  } catch (err) {
    logger.error({ err }, "Error getting order");
    res.status(500).json({ error: "Failed to get order" });
  }
});

// PATCH /api/orders/:id/status - Update order status (admin only)
router.patch(
  "/:id/status",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

      const { status } = req.body;
      const validStatuses = [
        "pending_payment",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const [order] = await db
        .update(ordersTable)
        .set({ status })
        .where(eq(ordersTable.id, id))
        .returning();

      if (!order) return res.status(404).json({ error: "Order not found" });

      logger.info(
        { userId: req.user?.id, orderId: order.orderId, newStatus: status },
        "Order status updated"
      );

      res.json(formatOrder(order));
    } catch (err) {
      logger.error({ err }, "Error updating order status");
      res.status(500).json({ error: "Failed to update order status" });
    }
  }
);

export default router;
    
