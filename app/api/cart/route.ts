import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

function getSessionId(req: Request): string {
  // 1. Check custom header (main persistence)
  let sessionId = req.headers.get("x-cart-session-id");
  if (sessionId) return sessionId;

  // 2. Check query params as a fallback
  const url = new URL(req.url);
  sessionId = url.searchParams.get("sessionId");
  if (sessionId) return sessionId;

  return "default_guest_session";
}

export async function GET(req: Request) {
  try {
    const sessionId = getSessionId(req);
    const res = await query(
      `
      SELECT c.id, c.product_id as "productId", c.quantity, c.session_id as "sessionId", c.created_at as "createdAt",
             p.name, p.brand, p.category, p.color, p.size, p.price, p.image, p.rating, p.sku
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      WHERE c.session_id = $1
      ORDER BY c.created_at ASC
    `,
      [sessionId]
    );

    // Map properties flat representation into nested format expected by the frontend
    const mapped = res.rows.map((row: any) => ({
      id: row.id,
      productId: row.productId,
      quantity: row.quantity,
      sessionId: row.sessionId,
      createdAt: row.createdAt,
      product: {
        id: row.productId,
        name: row.name,
        brand: row.brand,
        category: row.category,
        color: row.color,
        size: row.size,
        price: parseFloat(row.price) || 0,
        image: row.image,
        rating: parseFloat(row.rating) || 4.0,
        sku: row.sku,
      },
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error("Cart GET Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch cart items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionId = getSessionId(req);
    const body = await req.json().catch(() => ({}));

    // Handle adding multiple products at once (bundle)
    if (body.productIds && Array.isArray(body.productIds)) {
      for (const pId of body.productIds) {
        const existRes = await query("SELECT id, quantity FROM cart_items WHERE session_id = $1 AND product_id = $2", [
          sessionId,
          pId,
        ]);
        if (existRes.rows.length > 0) {
          await query("UPDATE cart_items SET quantity = quantity + 1 WHERE id = $1", [existRes.rows[0].id]);
        } else {
          await query("INSERT INTO cart_items (session_id, product_id, quantity) VALUES ($1, $2, 1)", [
            sessionId,
            pId,
          ]);
        }
      }
      return NextResponse.json({ success: true, message: "Bundle added to cart" });
    }

    // Handle adding/updating single product
    const { productId, quantity = 1, setQuantity } = body;
    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const existRes = await query("SELECT id, quantity FROM cart_items WHERE session_id = $1 AND product_id = $2", [
      sessionId,
      productId,
    ]);

    if (existRes.rows.length > 0) {
      const targetQty = setQuantity !== undefined ? setQuantity : existRes.rows[0].quantity + quantity;
      if (targetQty <= 0) {
        await query("DELETE FROM cart_items WHERE id = $1", [existRes.rows[0].id]);
      } else {
        await query("UPDATE cart_items SET quantity = $1 WHERE id = $2", [targetQty, existRes.rows[0].id]);
      }
    } else if (quantity > 0) {
      await query("INSERT INTO cart_items (session_id, product_id, quantity) VALUES ($1, $2, $3)", [
        sessionId,
        productId,
        quantity,
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Cart POST Error:", error);
    return NextResponse.json({ error: error.message || "Failed to modify cart" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionId = getSessionId(req);
    const body = await req.json().catch(() => ({}));

    if (body.clear) {
      await query("DELETE FROM cart_items WHERE session_id = $1", [sessionId]);
      return NextResponse.json({ success: true, message: "Cart cleared" });
    }

    const { productId } = body;
    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    await query("DELETE FROM cart_items WHERE session_id = $1 AND product_id = $2", [sessionId, productId]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Cart DELETE Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete cart item" }, { status: 500 });
  }
}
