import { NextRequest, NextResponse } from "next/server";
import { query as dbQuery } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const searchText = (body.search || "").toString().trim();

    let sql = "SELECT * FROM products";
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

    // Return products directly as an array
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
    const dbResult = await dbQuery("SELECT * FROM products ORDER BY id ASC LIMIT 100");
    return NextResponse.json(dbResult.rows);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}
