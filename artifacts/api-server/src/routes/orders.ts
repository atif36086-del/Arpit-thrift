import { Router } from "express";
import { db, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendNewOrderPush } from "./push";

const router = Router();

function generateOrderId(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `AT-${num}`;
}

function formatOrder(o: any) {
  return {
    ...o,
    totalAmount: parseFloat(o.totalAmount),
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt,
  };
}

// GET /api/orders
router.get("/", async (req, res) => {
  try {
    const { status } = req.query as Record<string, string>;
    let orders;
    if (status) {
      orders = await db.select().from(ordersTable).where(eq(ordersTable.status, status));
    } else {
      orders = await db.select().from(ordersTable);
    }
    // Sort newest first
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(orders.map(formatOrder));
  } catch (err) {
    logger.error({ err }, "Error listing orders");
    res.status(500).json({ error: "Failed to list orders" });
  }
});

// POST /api/orders
router.post("/", async (req, res) => {
  try {
    const { fullName, phone, address, city, state, pincode, items, totalAmount, notes } = req.body;

    const orderId = generateOrderId();
    const [order] = await db.insert(ordersTable).values({
      orderId,
      fullName,
      phone,
      address,
      city,
      state,
      pincode,
      items,
      totalAmount: String(totalAmount),
      status: "pending_payment",
      notes,
    }).returning();

    // Fire-and-forget push notification to admin
    sendNewOrderPush(orderId, fullName, String(totalAmount)).catch(() => {});

    res.status(201).json(formatOrder(order));
  } catch (err) {
    logger.error({ err }, "Error creating order");
    res.status(500).json({ error: "Failed to create order" });
  }
});

// GET /api/orders/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json(formatOrder(order));
  } catch (err) {
    logger.error({ err }, "Error getting order");
    res.status(500).json({ error: "Failed to get order" });
  }
});

// PATCH /api/orders/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const { status } = req.body;
    const validStatuses = ["pending_payment", "payment_verified", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [order] = await db.update(ordersTable).set({ status }).where(eq(ordersTable.id, id)).returning();
    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json(formatOrder(order));
  } catch (err) {
    logger.error({ err }, "Error updating order status");
    res.status(500).json({ error: "Failed to update order status" });
  }
});

export default router;
