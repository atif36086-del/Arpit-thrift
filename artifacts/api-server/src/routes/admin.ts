import { Router } from "express";
import { db, ordersTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const orders = await db.select().from(ordersTable);
    const products = await db.select().from(productsTable);

    const stats = {
      totalOrders: orders.length,
      pendingPayment: orders.filter(o => o.status === "pending_payment").length,
      paymentVerified: orders.filter(o => o.status === "payment_verified").length,
      shipped: orders.filter(o => o.status === "shipped").length,
      delivered: orders.filter(o => o.status === "delivered").length,
      totalRevenue: orders
        .filter(o => ["payment_verified", "shipped", "delivered"].includes(o.status))
        .reduce((sum, o) => sum + parseFloat(o.totalAmount as string), 0),
      totalProducts: products.length,
    };

    res.json(stats);
  } catch (err) {
    logger.error({ err }, "Error getting admin stats");
    res.status(500).json({ error: "Failed to get admin stats" });
  }
});

export default router;
