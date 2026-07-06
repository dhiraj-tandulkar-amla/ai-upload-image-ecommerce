import { NextRequest, NextResponse } from "next/server";
import { query as dbQuery } from "@/lib/db";

/**
 * Builds the SELECT columns with a smart image resolver.
 * Priority: valid http image column → attributes->>'image_url' → '/placeholder.svg'
 * This ensures images always bind correctly even if the image column has bad data
 * (e.g. images_count value like "6" or "1" from CSV mapping bugs).
 */
const PRODUCT_SELECT = `
  id, name, sku, brand, category, color, size, price, rating, description, attributes,
  CASE
    WHEN image IS NOT NULL AND image LIKE 'http%' AND LENGTH(image) > 15
      THEN image
    WHEN attributes->>'image_url' IS NOT NULL AND attributes->>'image_url' LIKE 'http%'
      THEN attributes->>'image_url'
    ELSE '/placeholder.svg'
  END AS image
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const searchText = (body.search || "").toString().trim();

    let sql = `SELECT ${PRODUCT_SELECT} FROM products`;
    let params: any[] = [];

    if (searchText) {
      const searchWords = searchText.toLowerCase().split(/\s+/).filter(Boolean);
      if (searchWords.length > 0) {
        const conditions: string[] = [];
        searchWords.forEach((word: string, index: number) => {
          const paramIndex = index + 1;
          params.push(`%${word}%`);
          conditions.push(`(
            LOWER(name) LIKE $${paramIndex} OR 
            LOWER(brand) LIKE $${paramIndex} OR 
            LOWER(category) LIKE $${paramIndex} OR 
            LOWER(color) LIKE $${paramIndex} OR 
            LOWER(sku) LIKE $${paramIndex} OR
            LOWER(description) LIKE $${paramIndex} OR
            LOWER(attributes::text) LIKE $${paramIndex}
          )`);
        });
        sql += " WHERE " + conditions.join(" AND ");
      }
    }

    sql += " ORDER BY id ASC";

    const dbResult = await dbQuery(sql, params);
    return NextResponse.json(dbResult.rows);
  } catch (error: any) {
    console.error("Products search route error:", {
      message: error?.message,
      stack: error?.stack,
    });

    return NextResponse.json(
      { error: error?.message || "Failed to fetch products from Supabase" },
      { status: 500 }
    );
  }
}

// Support GET for general listings
export async function GET() {
  try {
    const dbResult = await dbQuery(
      `SELECT ${PRODUCT_SELECT} FROM products ORDER BY id ASC LIMIT 100`
    );
    return NextResponse.json(dbResult.rows);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}
