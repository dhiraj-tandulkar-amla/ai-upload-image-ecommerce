"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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

interface SearchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    isBundle?: boolean;
    bundleName?: string;
    products?: any[];
    extractedCriteria?: any[];
    imageMime?: string;
    imageBase64?: string;
  } | null;
  onCartUpdated?: () => void;
}

export default function SearchPopup({ isOpen, onClose, initialData, onCartUpdated }: SearchPopupProps) {
  const [data, setData] = useState(initialData);
  const [nlpCommand, setNlpCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState<number | null>(null);
  const [bundleCartLoading, setBundleCartLoading] = useState(false);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  if (!isOpen || !data) return null;

  const products = data.products || [];
  const isBundle = !!data.isBundle;
  const bundleName = data.bundleName || "";
  const base64Image = data.imageBase64 || "";
  const mimeType = data.imageMime || "image/jpeg";

  async function handleNlpRefine(e: React.FormEvent) {
    e.preventDefault();
    if (!nlpCommand.trim()) return;

    try {
      setLoading(true);
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          mimeType: mimeType,
          nlpCommand: nlpCommand,
        }),
      });

      if (!res.ok) throw new Error("Failed to refine results");

      const refinedData = await res.json();
      setData(refinedData);
      setNlpCommand("");
    } catch (err) {
      console.error("Refine Error:", err);
      alert("Failed to refine search results. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToCart(productId: number) {
    try {
      setCartLoading(productId);
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-cart-session-id": getCartSessionId()
        },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (res.ok) {
        if (onCartUpdated) onCartUpdated();
      } else {
        alert("Failed to add product to cart");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCartLoading(null);
    }
  }

  async function handleAddBundleToCart() {
    if (products.length === 0) return;
    const productIds = products.map((p) => p.id);

    try {
      setBundleCartLoading(true);
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-cart-session-id": getCartSessionId()
        },
        body: JSON.stringify({ productIds }),
      });
      if (res.ok) {
        if (onCartUpdated) onCartUpdated();
        onClose();
      } else {
        alert("Failed to add bundle to cart");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBundleCartLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-100 max-h-[90vh] md:max-h-[80vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-950 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Left Side: Uploaded Image Preview */}
        <div className="w-full md:w-2/5 bg-gray-950 flex flex-col items-center justify-center p-6 border-b md:border-b-0 md:border-r border-gray-100 relative min-h-[250px] md:min-h-0">
          <div className="absolute top-4 left-4 text-xs font-semibold text-white/80 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-md">
            Uploaded Image
          </div>
          {base64Image ? (
            <img
              src={`data:${mimeType};base64,${base64Image}`}
              alt="Uploaded product preview"
              className="max-w-full max-h-[300px] object-contain rounded-xl shadow-lg border border-white/10"
            />
          ) : (
            <div className="text-white/45 text-sm">No Image Preview</div>
          )}
        </div>

        {/* Right Side: Results and NLP Input */}
        <div className="w-full md:w-3/5 p-6 flex flex-col h-full overflow-y-auto">
          {/* Header info */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">AI Search Results</h2>
            {isBundle && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm animate-pulse">
                <span>📦</span>
                <span>Bundle Detected: {bundleName || "Multiple Items"}</span>
              </div>
            )}
          </div>

          {/* Results grid */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="text-sm font-medium text-gray-600">Processing visual command...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-base font-medium">No matching products found in stock.</p>
                <p className="text-xs text-gray-400 mt-1">Try typing an NLP command below to refine the search.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-4 p-3 bg-gray-50 hover:bg-gray-100/70 border border-gray-100 rounded-2xl transition-all duration-200"
                    >
                      <div className="h-16 w-16 bg-white border rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                        {product.image ? (
                          <img
                            src={formatProductImage(product.image)}
                            alt={product.name}
                            className="h-full w-full object-contain p-1"
                            onError={(e) => {
                              (e.target as any).src = "/placeholder.svg";
                            }}
                          />
                        ) : (
                          <div className="text-[10px] text-gray-400">No Image</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">{product.name}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {product.brand} • {product.color} {product.size !== "N/A" && `• Size ${product.size}`}
                        </p>
                        <p className="text-sm font-bold text-blue-600 mt-1">₹{product.price}</p>
                      </div>
                      <button
                        onClick={() => handleAddToCart(product.id)}
                        disabled={cartLoading === product.id}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-xs rounded-xl shadow transition-colors"
                      >
                        {cartLoading === product.id ? "Adding..." : "Add to Cart"}
                      </button>
                    </div>
                  ))}
                </div>

                {isBundle && (
                  <div className="mt-4 p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-indigo-900">Buy entire bundle together</p>
                      <p className="text-xs text-indigo-700 mt-0.5">
                        Add all {products.length} products to your cart.
                      </p>
                    </div>
                    <button
                      onClick={handleAddBundleToCart}
                      disabled={bundleCartLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm rounded-xl shadow-md transition-colors"
                    >
                      {bundleCartLoading ? "Adding Bundle..." : "Add Bundle to Cart"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* NLP Command Form */}
          <form onSubmit={handleNlpRefine} className="mt-6 pt-4 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">
              Improve Results with NLP Commands
            </label>
            <div className="flex gap-2">
              <input
                value={nlpCommand}
                onChange={(e) => setNlpCommand(e.target.value)}
                placeholder="e.g. 'show me black nike shoes', 'change color to blue'"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={loading || !nlpCommand.trim()}
                className="px-5 py-2.5 bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white text-sm font-semibold rounded-2xl transition-all shadow"
              >
                Apply
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
