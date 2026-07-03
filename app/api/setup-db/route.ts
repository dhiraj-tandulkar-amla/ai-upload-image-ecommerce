import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const resProducts = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'products'
      );
    `);
    const resCart = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'cart_items'
      );
    `);

    const productsExists = resProducts.rows[0].exists;
    const cartExists = resCart.rows[0].exists;

    let productCount = 0;
    if (productsExists) {
      const countRes = await query("SELECT COUNT(*) FROM products");
      productCount = parseInt(countRes.rows[0].count, 10);
    }

    return NextResponse.json({
      connected: true,
      tables: {
        products: productsExists,
        cart_items: cartExists,
      },
      productCount,
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      error: error.message || "Failed to connect to PostgreSQL database",
    });
  }
}

export async function POST() {
  try {
    // 1. Create products table
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        image TEXT,
        color TEXT,
        size TEXT,
        category TEXT,
        brand TEXT,
        price NUMERIC(10, 2) DEFAULT 0.00,
        rating NUMERIC(3, 2) DEFAULT 4.0,
        description TEXT,
        attributes JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create cart_items table
    await query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 1,
        session_id TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create indexes for searching
    await query(`
      CREATE INDEX IF NOT EXISTS idx_products_search 
      ON products (name, category, brand, color);
    `);

    return NextResponse.json({
      success: true,
      message: "Database tables and indexes created successfully.",
    });
  } catch (error: any) {
    console.error("DB Setup Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to setup database tables" },
      { status: 500 }
    );
  }
}
