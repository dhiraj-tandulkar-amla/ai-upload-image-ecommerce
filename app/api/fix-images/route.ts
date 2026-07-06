import { NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * POST /api/fix-images
 * Repairs the `image` column for all products where:
 *  - The image is missing, a placeholder, or an Amazon product page URL (amazon.com/...)
 *  - AND the attributes JSONB contains a real CDN image URL (image_url key)
 */
export async function POST() {
  try {
    // Update rows where image is bad but attributes has a good image_url
    const result = await query(`
      UPDATE products
      SET image = attributes->>'image_url'
      WHERE
        attributes->>'image_url' IS NOT NULL
        AND attributes->>'image_url' != ''
        AND (
          image IS NULL
          OR image = '/placeholder.svg'
          OR image LIKE '%amazon.com/%'
          OR LENGTH(image) < 10
          OR image NOT LIKE 'http%'
        )
      RETURNING id, name, image
    `);

    return NextResponse.json({
      success: true,
      fixedCount: result.rowCount ?? 0,
      sample: result.rows.slice(0, 5).map((r) => ({
        id: r.id,
        name: r.name,
        newImage: r.image,
      })),
    });
  } catch (error: any) {
    console.error("Fix Images Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fix images" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/fix-images
 * Diagnose: count how many products have broken image URLs
 */
export async function GET() {
  try {
    const broken = await query(`
      SELECT COUNT(*) as count
      FROM products
      WHERE
        attributes->>'image_url' IS NOT NULL
        AND (
          image IS NULL
          OR image = '/placeholder.svg'
          OR image LIKE '%amazon.com/%'
          OR LENGTH(image) < 10
          OR image NOT LIKE 'http%'
        )
    `);

    const total = await query(`SELECT COUNT(*) as count FROM products`);

    return NextResponse.json({
      totalProducts: parseInt(total.rows[0].count, 10),
      brokenImageCount: parseInt(broken.rows[0].count, 10),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to diagnose images" },
      { status: 500 }
    );
  }
}
