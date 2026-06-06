import { Router } from "express";
import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db, ordersTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

interface WebhookPayment {
  entity: {
    id: string;
    order_id: string;
    status: string;
  };
}

interface WebhookEvent {
  event: string;
  payload: {
    payment: WebhookPayment;
  };
}

async function deductInventory(orderId: number): Promise<boolean> {
  try {
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId));

    if (!order || order.inventoryDeducted) {
      logger.info({ orderId }, "Inventory already deducted or order not found");
      return false;
    }

    const items = JSON.parse(order.items);

    for (const item of items) {
      const [product] = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, item.productId));

      if (!product) {
        logger.warn(
          { productId: item.productId, orderId },
          "Product not found during inventory deduction"
        );
        continue;
      }

      const newStockCount = (product.stockCount || 0) - item.quantity;
      const inStock = newStockCount > 0;

      await db
        .update(productsTable)
        .set({
          stockCount: newStockCount,
          inStock,
        })
        .where(eq(productsTable.id, item.productId));

      logger.info(
        { productId: item.productId, quantity: item.quantity, newStock: newStockCount },
        "Inventory deducted"
      );
    }

    await db
      .update(ordersTable)
      .set({ inventoryDeducted: true })
      .where(eq(ordersTable.id, orderId));

    logger.info({ orderId }, "Inventory deduction completed");
    return true;
  } catch (err) {
    logger.error({ err, orderId }, "Error deducting inventory");
    return false;
  }
}

// POST /api/payments/create-order
// Creates a Razorpay order for payment processing
router.post("/create-order", async (req, res) => {
  try {
    const { orderId } = req.body as { orderId: number };
    if (!orderId) return res.status(400).json({ error: "orderId required" });

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId));

    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.paymentStatus === "paid") {
      logger.warn({ orderId }, "Attempting to create order for already paid order");
      return res.status(400).json({ error: "Order already paid" });
    }

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

    await db
      .update(ordersTable)
      .set({ razorpayOrderId: rzpOrder.id })
      .where(eq(ordersTable.id, orderId));

    logger.info({ orderId, razorpayOrderId: rzpOrder.id }, "Razorpay order created");

    res.json({
      razorpayOrderId: rzpOrder.id,
      amount: amountPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      orderRef: order.orderId,
      customerName: order.fullName,
      customerPhone: order.phone,
      customerEmail: order.email,
    });
  } catch (err) {
    logger.error({ err }, "Error creating Razorpay order");
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

// POST /api/payments/verify
// Called by frontend after payment modal closes
// Verifies HMAC signature from Razorpay response
// Note: Webhook is authoritative for payment confirmation
router.post("/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body as {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      orderId: number;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      logger.warn({ orderId, razorpay_order_id }, "Razorpay signature mismatch");
      return res.status(400).json({ error: "Payment verification failed" });
    }

    logger.info(
      { orderId, razorpay_payment_id, razorpay_order_id },
      "Payment signature verified - awaiting webhook confirmation"
    );

    res.json({
      success: true,
      orderId,
      message: "Payment verified. Awaiting confirmation.",
    });
  } catch (err) {
    logger.error({ err }, "Error verifying payment");
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// POST /api/payments/webhook
// Razorpay webhook — authoritative server-side confirmation
// Register in Razorpay dashboard: <your-domain>/api/payments/webhook
// Uses raw body for HMAC verification
// Handles: payment.captured, payment.authorized, payment.failed
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const startTime = Date.now();

    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET! || process.env.RAZORPAY_KEY_SECRET!;
      const signature = req.headers["x-razorpay-signature"] as string;
      const body = req.body as Buffer;

      if (!signature) {
        logger.warn("Webhook missing signature header");
        return res.status(400).json({ error: "Missing signature" });
      }

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");

      if (expectedSignature !== signature) {
        logger.warn("Webhook signature mismatch");
        return res.status(400).json({ error: "Invalid signature" });
      }

      const event = JSON.parse(body.toString()) as WebhookEvent;

      logger.info(
        { event: event.event, paymentId: event.payload?.payment?.entity?.id },
        "Webhook received and verified"
      );

      if (event.event === "payment.captured") {
        const { order_id, id: payment_id, status } = event.payload.payment.entity;

        const [order] = await db
          .select()
          .from(ordersTable)
          .where(eq(ordersTable.razorpayOrderId, order_id));

        if (!order) {
          logger.warn({ order_id }, "Order not found for webhook");
          return res.json({ received: true });
        }

        if (order.paymentStatus === "paid") {
          logger.info(
            { order_id, orderId: order.id },
            "Payment already processed - ignoring duplicate webhook"
          );
          return res.json({ received: true });
        }

        await db
          .update(ordersTable)
          .set({
            razorpayPaymentId: payment_id,
            paymentStatus: "paid",
            status: "confirmed",
          })
          .where(eq(ordersTable.razorpayOrderId, order_id));

        logger.info(
          { orderId: order.id, order_id, payment_id },
          "Webhook: payment captured and order confirmed"
        );

        const deductionSuccess = await deductInventory(order.id);
        if (!deductionSuccess) {
          logger.warn({ orderId: order.id }, "Inventory deduction failed in webhook");
        }
      } else if (event.event === "payment.authorized") {
        const { order_id, id: payment_id } = event.payload.payment.entity;

        const [order] = await db
          .select()
          .from(ordersTable)
          .where(eq(ordersTable.razorpayOrderId, order_id));

        if (order && order.paymentStatus === "pending") {
          await db
            .update(ordersTable)
            .set({
              razorpayPaymentId: payment_id,
              paymentStatus: "authorized",
            })
            .where(eq(ordersTable.razorpayOrderId, order_id));

          logger.info(
            { orderId: order.id, order_id, payment_id },
            "Webhook: payment authorized"
          );
        }
      } else if (event.event === "payment.failed") {
        const { order_id, id: payment_id } = event.payload.payment.entity;

        const [order] = await db
          .select()
          .from(ordersTable)
          .where(eq(ordersTable.razorpayOrderId, order_id));

        if (order) {
          await db
            .update(ordersTable)
            .set({
              paymentStatus: "failed",
              status: "pending_payment",
            })
            .where(eq(ordersTable.razorpayOrderId, order_id));

          logger.warn(
            { orderId: order.id, order_id, payment_id },
            "Webhook: payment failed"
          );
        }
      }

      const processingTime = Date.now() - startTime;
      logger.info({ event: event.event, processingTime }, "Webhook processed");

      res.json({ received: true });
    } catch (err) {
      logger.error({ err }, "Webhook processing error");
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

export default router;
