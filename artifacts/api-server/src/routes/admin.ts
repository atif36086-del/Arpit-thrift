import { Router } from "express";
import { db, ordersTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { AuthenticatedRequest, authMiddleware, adminMiddleware } from "../middlewares/auth";

const router = Router();

// GET /api/admin/stats - Get admin statistics (admin only)
router.get(
  "/stats",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const orders = await db.select().from(ordersTable);
      const products = await db.select().from(productsTable);

      const stats = {
        totalOrders: orders.length,
        pendingPayment: orders.filter((o) => o.status === "pending_payment").length,
        confirmed: orders.filter((o) => o.status === "confirmed").length,
        shipped: orders.filter((o) => o.status === "shipped").length,
        delivered: orders.filter((o) => o.status === "delivered").length,
        cancelled: orders.filter((o) => o.status === "cancelled").length,
        totalRevenue: orders
          .filter((o) => ["confirmed", "shipped", "delivered"].includes(o.status))
          .reduce((sum, o) => sum + parseFloat(o.totalAmount as string), 0),
        pendingRevenue: orders
          .filter((o) => o.status === "pending_payment")
          .reduce((sum, o) => sum + parseFloat(o.totalAmount as string), 0),
        totalProducts: products.length,
        productsInStock: products.filter((p) => p.inStock).length,
        lowStockProducts: products.filter((p) => (p.stockCount || 0) < 10 && p.inStock).length,
      };

      logger.info({ userId: req.user?.id }, "Admin stats retrieved");

      res.json(stats);
    } catch (err) {
      logger.error({ err }, "Error getting admin stats");
      res.status(500).json({ error: "Failed to get admin stats" });
    }
  }
);

// GET /api/admin/orders - Get all orders with filters (admin only)
router.get(
  "/orders",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { status, limit = "50", offset = "0" } = req.query as Record<string, string>;
      let query = db.select().from(ordersTable);

      if (status) {
        const [orders] = await db
          .select()
          .from(ordersTable)
          .where(eq(ordersTable.status, status));
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);
        
        const filtered = status ? orders.filter((o) => o.status === status) : [orders];
        const paginated = filtered.slice(offsetNum, offsetNum + limitNum);

        logger.info(
          { userId: req.user?.id, status, count: paginated.length },
          "Admin orders retrieved"
        );

        return res.json({
          orders: paginated.map(formatOrder),
          total: filtered.length,
        });
      }

      const allOrders = await db.select().from(ordersTable);
      allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const limitNum = parseInt(limit);
      const offsetNum = parseInt(offset);
      const paginated = allOrders.slice(offsetNum, offsetNum + limitNum);

      logger.info(
        { userId: req.user?.id, count: paginated.length, total: allOrders.length },
        "Admin orders retrieved"
      );

      res.json({
        orders: paginated.map(formatOrder),
        total: allOrders.length,
      });
    } catch (err) {
      logger.error({ err }, "Error getting admin orders");
      res.status(500).json({ error: "Failed to get admin orders" });
    }
  }
);

// GET /api/admin/products - Get all products (admin only)
router.get(
  "/products",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const products = await db.select().from(productsTable);

      logger.info({ userId: req.user?.id, count: products.length }, "Admin products retrieved");

      res.json(products.map(formatProduct));
    } catch (err) {
      logger.error({ err }, "Error getting admin products");
      res.status(500).json({ error: "Failed to get admin products" });
    }
  }
);

// POST /api/admin/products - Create product (admin only)
router.post(
  "/products",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const {
        name,
        description,
        price,
        originalPrice,
        images,
        category,
        sizes,
        colors,
        stockCount,
        isNew,
        isBestSeller,
        isFeatured,
        tags,
      } = req.body;

      if (!name || !price || !category) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const [product] = await db
        .insert(productsTable)
        .values({
          name,
          description,
          price: String(price),
          originalPrice: originalPrice ? String(originalPrice) : null,
          images: images || [],
          category,
          sizes: sizes || [],
          colors: colors || [],
          inStock: (stockCount || 0) > 0,
          stockCount,
          isNew: isNew || false,
          isBestSeller: isBestSeller || false,
          isFeatured: isFeatured || false,
          tags: tags || [],
        })
        .returning();

      logger.info(
        { userId: req.user?.id, productId: product.id, name: product.name },
        "Product created"
      );

      res.status(201).json(formatProduct(product));
    } catch (err) {
      logger.error({ err }, "Error creating product");
      res.status(500).json({ error: "Failed to create product" });
    }
  }
);

// PATCH /api/admin/products/:id - Update product (admin only)
router.patch(
  "/products/:id",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

      const updates: Record<string, any> = {};
      const body = req.body;

      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) updates.description = body.description;
      if (body.price !== undefined) updates.price = String(body.price);
      if (body.originalPrice !== undefined) updates.originalPrice = body.originalPrice ? String(body.originalPrice) : null;
      if (body.images !== undefined) updates.images = body.images;
      if (body.category !== undefined) updates.category = body.category;
      if (body.sizes !== undefined) updates.sizes = body.sizes;
      if (body.colors !== undefined) updates.colors = body.colors;
      if (body.stockCount !== undefined) {
        updates.stockCount = body.stockCount;
        updates.inStock = body.stockCount > 0;
      }
      if (body.inStock !== undefined) updates.inStock = body.inStock;
      if (body.isNew !== undefined) updates.isNew = body.isNew;
      if (body.isBestSeller !== undefined) updates.isBestSeller = body.isBestSeller;
      if (body.isFeatured !== undefined) updates.isFeatured = body.isFeatured;
      if (body.tags !== undefined) updates.tags = body.tags;

      const [product] = await db
        .update(productsTable)
        .set(updates)
        .where(eq(productsTable.id, id))
        .returning();

      if (!product) return res.status(404).json({ error: "Product not found" });

      logger.info(
        { userId: req.user?.id, productId: id, name: product.name },
        "Product updated"
      );

      res.json(formatProduct(product));
    } catch (err) {
      logger.error({ err }, "Error updating product");
      res.status(500).json({ error: "Failed to update product" });
    }
  }
);

// DELETE /api/admin/products/:id - Delete product (admin only)
router.delete(
  "/products/:id",
  authMiddleware,
  adminMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

      const [product] = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, id));

      if (!product) return res.status(404).json({ error: "Product not found" });

      await db.delete(productsTable).where(eq(productsTable.id, id));

      logger.info(
        { userId: req.user?.id, productId: id, name: product.name },
        "Product deleted"
      );

      res.status(204).send();
    } catch (err) {
      logger.error({ err }, "Error deleting product");
      res.status(500).json({ error: "Failed to delete product" });
    }
  }
);

function formatOrder(o: any) {
  return {
    ...o,
    totalAmount: parseFloat(o.totalAmount),
    items: typeof o.items === "string" ? JSON.parse(o.items) : o.items,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt,
  };
}

function formatProduct(p: any) {
  return {
    ...p,
    price: parseFloat(p.price),
    originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

export default router;
      
