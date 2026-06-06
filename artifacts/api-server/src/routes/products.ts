import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, ilike, and, desc, asc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/products - List all products with filtering
router.get("/", async (req, res) => {
  try {
    const { category, search, sortBy, inStock } = req.query as Record<string, string>;

    const conditions = [];

    if (category) conditions.push(eq(productsTable.category, category));
    if (inStock === "true") conditions.push(eq(productsTable.inStock, true));
    if (search) conditions.push(ilike(productsTable.name, `%${search}%`));

    let query: any =
      conditions.length > 0
        ? db.select().from(productsTable).where(and(...conditions))
        : db.select().from(productsTable);

    if (sortBy === "price_asc") {
      query = query.orderBy(asc(sql`price::numeric`));
    } else if (sortBy === "price_desc") {
      query = query.orderBy(desc(sql`price::numeric`));
    } else if (sortBy === "popular") {
      query = query.orderBy(desc(productsTable.isBestSeller));
    } else if (sortBy === "newest") {
      query = query.orderBy(desc(productsTable.createdAt));
    } else {
      query = query.orderBy(desc(productsTable.createdAt));
    }

    const products = await query;

    logger.info(
      {
        count: products.length,
        filters: { category, search, sortBy, inStock },
      },
      "Products listed"
    );

    res.json(products.map(formatProduct));
  } catch (err) {
    logger.error({ err }, "Error listing products");
    res.status(500).json({ error: "Failed to list products" });
  }
});

// GET /api/products/featured - Get featured, new arrivals, and bestsellers
router.get("/featured", async (req, res) => {
  try {
    const allProducts = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.inStock, true));

    const featured = allProducts
      .filter((p) => p.isFeatured)
      .slice(0, 6);
    const newArrivals = allProducts
      .filter((p) => p.isNew)
      .slice(0, 6);
    const bestSellers = allProducts
      .filter((p) => p.isBestSeller)
      .slice(0, 6);

    logger.info(
      {
        featured: featured.length,
        newArrivals: newArrivals.length,
        bestSellers: bestSellers.length,
      },
      "Featured products retrieved"
    );

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

// GET /api/products/:id - Get single product
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id));

    if (!product) return res.status(404).json({ error: "Product not found" });

    logger.info({ productId: id, name: product.name }, "Product retrieved");

    res.json(formatProduct(product));
  } catch (err) {
    logger.error({ err }, "Error getting product");
    res.status(500).json({ error: "Failed to get product" });
  }
});

function formatProduct(p: any) {
  return {
    ...p,
    price: parseFloat(p.price),
    originalPrice: p.originalPrice ? parseFloat(p.originalPrice) : null,
    createdAt:
      p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt:
      p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  };
}

export default router;
