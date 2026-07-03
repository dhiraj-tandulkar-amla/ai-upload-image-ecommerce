"use client";

import { useState } from "react";
import { Product } from "@/types/product";
import { formatProductImage } from "@/lib/utils";

function getCartSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem("guest_cart_session_id");
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("guest_cart_session_id", sessionId);
  }
  return sessionId;
}

interface Props {
  product: Product;
  onCompare: (product: Product) => void;
}

export default function ProductCard({ product, onCompare }: Props) {
  const [cartLoading, setCartLoading] = useState(false);

  async function handleAddToCart(buyNow = false) {
    try {
      setCartLoading(true);
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-cart-session-id": getCartSessionId()
        },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });

      if (res.ok) {
        // Dispatch global event so the Header refreshes its cart
        window.dispatchEvent(new Event("cart-updated"));
        if (buyNow) {
          alert(`Checking out "${product.name}"!`);
        }
      } else {
        alert("Failed to add to cart");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCartLoading(false);
    }
  }

  return (
    <div className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full">
      <div>
        <div className="flex h-44 items-center justify-center rounded-xl bg-gray-50 overflow-hidden relative border border-gray-100/50">
          {product.image ? (
            <img
              src={formatProductImage(product.image)}
              alt={product.name}
              className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as any).src = "/placeholder.svg";
              }}
            />
          ) : (
            <span className="text-xs text-gray-400">No Image</span>
          )}
          {product.rating && (
            <span className="absolute bottom-2 left-2 bg-white/90 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs shadow-xs border flex items-center gap-0.5">
              ⭐ {product.rating}
            </span>
          )}
        </div>

        <h3 className="mt-4 font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>

        <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">
          {product.brand} • {product.color}
        </p>

        <p className="mt-2 text-lg font-bold text-gray-950">₹{product.price}</p>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => handleAddToCart(false)}
            disabled={cartLoading}
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            {cartLoading ? "Adding..." : "Add to Cart"}
          </button>
          <button
            onClick={() => handleAddToCart(true)}
            disabled={cartLoading}
            className="flex-1 rounded-xl bg-gray-900 hover:bg-black disabled:bg-gray-400 py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Buy Now
          </button>
        </div>

        <button
          onClick={() => onCompare(product)}
          className="w-full rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 py-2 text-xs font-medium text-gray-600 transition-colors cursor-pointer"
        >
          Add to Compare
        </button>
      </div>
    </div>
  );
}