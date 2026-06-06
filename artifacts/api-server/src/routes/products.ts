import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, ilike, and, desc, asc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const { category, search, sortBy, inStock } = req.query as Record<string, string>;

    let query = db.select().from(productsTable);
    const conditions = [];

    if (category) conditions.push(eq(productsTable.category, category));
    if (inStock === "true") conditions.push(eq(productsTable.inStock, true));
    if (search) conditions.push(ilike(productsTable.name, `%${search}%`));

    let finalQuery: any = conditions.length > 0 ? db.select().from(productsTable).where(and(...conditions)) : db.select().from(productsTable);

    if (sortBy === "price_asc") finalQuery = finalQuery.orderBy(asc(sql`price::numeric`));
    else if (sortBy === "price_desc") finalQuery = finalQuery.orderBy(desc(sql`price::numeric`));
    else if (sortBy === "popular") finalQuery = finalQuery.orderBy(desc(productsTable.isBestSeller));
    else finalQuery = finalQuery.orderBy(desc(productsTable.createdAt));

    const products = await finalQuery;
    res.json(products.map(formatProduct));
  } catch (err) {
    logger.error({ err }, "Error listing products");
    res.status(500).json({ error: "Failed to list products" });
  }
});

// GET /api/products/featured
router.get("/featured", async (req, res) => {
  try {
    const allProducts = await db.select().from(productsTable).where(eq(productsTable.inStock, true));
    const featured = allProducts.filter(p => p.isFeatured).slice(0, 6);
    const newArrivals = allProducts.filter(p => p.isNew).slice(0, 6);
    const bestSellers = allProducts.filter(p => p.isBestSeller).slice(0, 6);
    res.json({
      featured: featured.map(formatProduct),
      newArrivals: newArrivals.map(formatProduct),
      bestSellers: bestSellers.map(formatProduct),
    });
  } catch (err) {
    logger.error({ err }, "Error getting featured products");
    res.status(500).json({ error: "Failed to get featured products" });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) return res.status(404).json({ error: "Product not found" });

    res.json(formatProduct(product));
  } catch (err) {
    logger.error({ err }, "Error getting product");
    res.status(500).json({ error: "Failed to get product" });
  }
});

// POST /api/products
router.post("/", async (req, res) => {
  try {
    const { name, description, price, originalPrice, images, category, sizes, colors, inStock, stockCount, isNew, isBestSeller, isFeatured, tags } = req.body;
    const [product] = await db.insert(productsTable).values({
      name,
      description,
      price: String(price),
      originalPrice: originalPrice != null ? String(originalPrice) : null,
      images: images ?? [],
      category,
      sizes: sizes ?? [],
      colors: colors ?? [],
      inStock: inStock ?? true,
      stockCount,
      isNew: isNew ?? false,
      isBestSeller: isBestSeller ?? false,
      isFeatured: isFeatured ?? false,
      tags: tags ?? [],
    }).returning();
    res.status(201).json(formatProduct(product));
  } catch (err) {
    logger.error({ err }, "Error creating product");
    res.status(500).json({ error: "Failed to create product" });
  }
});

// PATCH /api/products/:id
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const updates: Record<string, any> = {};
    const body = req.body;
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.price !== undefined) updates.price = String(body.price);
    if (body.originalPrice !== undefined) updates.originalPrice = body.originalPrice != null ? String(body.originalPrice) : null;
    if (body.images !== undefined) updates.images = body.images;
    if (body.category !== undefined) updates.category = body.category;
    if (body.sizes !== undefined) updates.sizes = body.sizes;
    if (body.colors !== undefined) updates.colors = body.colors;
    if (body.inStock !== undefined) updates.inStock = body.inStock;
    if (body.stockCount !== undefined) updates.stockCount = body.stockCount;
    if (body.isNew !== undefined) updates.isNew = body.isNew;
    if (body.isBestSeller !== undefined) updates.isBestSeller = body.isBestSeller;
    if (body.isFeatured !== undefined) updates.isFeatured = body.isFeatured;
    if (body.tags !== undefined) updates.tags = body.tags;

    const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
    if (!product) return res.status(404).json({ error: "Product not found" });

    res.json(formatProduct(product));
  } catch (err) {
    logger.error({ err }, "Error updating product");
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Error deleting product");
    res.status(500).json({ error: "Failed to delete product" });
  }
});

function formatProduct(p: any) {
  return {
    ...p,
    price: parseFloat(p.price),
    originalPrice: p.originalPrice != null ? parseFloat(p.originalPrice) : null,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

export default router;
