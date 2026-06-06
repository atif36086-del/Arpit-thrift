import { Router } from "express";
import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db, ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// POST /api/payments/create-order
router.post("/create-order", async (req, res) => {
  try {
    const { orderId } = req.body as { orderId: number };
    if (!orderId) return res.status(400).json({ error: "orderId required" });

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) return res.status(404).json({ error: "Order not found" });

    const amountPaise = Math.round(parseFloat(order.totalAmount) * 100);

    const rzpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: order.orderId,
      notes: {
        orderId: String(order.id),
        customerName: order.fullName,
        customerPhone: order.phone,
      },
    });

    await db.update(ordersTable)
      .set({ razorpayOrderId: rzpOrder.id })
      .where(eq(ordersTable.id, orderId));

    res.json({
      razorpayOrderId: rzpOrder.id,
      amount: amountPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      orderRef: order.orderId,
      customerName: order.fullName,
      customerPhone: order.phone,
    });
  } catch (err) {
    logger.error({ err }, "Error creating Razorpay order");
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// POST /api/payments/verify
// Called by frontend after payment modal closes — verifies HMAC signature
router.post("/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      orderId: number;
    };

    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      logger.warn({ orderId }, "Razorpay signature mismatch");
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const [order] = await db
      .update(ordersTable)
      .set({
        razorpayPaymentId: razorpay_payment_id,
        paymentStatus: "paid",
        status: "payment_verified",
      })
      .where(eq(ordersTable.id, orderId))
      .returning();

    if (!order) return res.status(404).json({ error: "Order not found" });

    logger.info({ orderId, razorpay_payment_id }, "Payment verified successfully");
    res.json({ success: true, orderId: order.id, orderRef: order.orderId });
  } catch (err) {
    logger.error({ err }, "Error verifying payment");
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// POST /api/payments/webhook
// Razorpay webhook — authoritative server-side confirmation
// Register in Razorpay dashboard: <your-domain>/api/payments/webhook
// Uses raw body for HMAC verification
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const signature = req.headers["x-razorpay-signature"] as string;
    const body = req.body as Buffer;

    const expectedSignature = crypto.createHmac("sha256", secret).update(body).digest("hex");

    if (expectedSignature !== signature) {
      logger.warn("Webhook signature mismatch");
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(body.toString()) as {
      event: string;
      payload: { payment: { entity: { order_id: string; id: string } } };
    };

    if (event.event === "payment.captured") {
      const { order_id, id: payment_id } = event.payload.payment.entity;

      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.razorpayOrderId, order_id));
      if (order && order.paymentStatus !== "paid") {
        await db
          .update(ordersTable)
          .set({
            razorpayPaymentId: payment_id,
            paymentStatus: "paid",
            status: "payment_verified",
          })
          .where(eq(ordersTable.razorpayOrderId, order_id));

        logger.info({ order_id, payment_id }, "Webhook: payment captured");
      }
    }

    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, "Webhook error");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
