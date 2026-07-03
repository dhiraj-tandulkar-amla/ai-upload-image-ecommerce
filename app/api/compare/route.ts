import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json().catch(() => ({}));

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json([]);
    }

    // Sanitize and filter numerical IDs
    const parsedIds = ids.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));

    if (parsedIds.length === 0) {
      return NextResponse.json([]);
    }

    const placeholders = parsedIds.map((_, i) => `$${i + 1}`).join(",");
    const res = await query(
      `SELECT * FROM products WHERE id IN (${placeholders}) ORDER BY id ASC`,
      parsedIds
    );

    return NextResponse.json(res.rows);
  } catch (error: any) {
    console.error("Compare fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch compare products" },
      { status: 500 }
    );
  }
}
