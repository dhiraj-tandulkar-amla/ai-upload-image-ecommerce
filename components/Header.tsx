"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SearchPopup from "./SearchPopup";
import { CartItem } from "@/types/cart";

function getCartSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem("guest_cart_session_id");
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("guest_cart_session_id", sessionId);
  }
  return sessionId;
}

export default function Header() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);

  // AI Search states
  const [isSearchPopupOpen, setIsSearchPopupOpen] = useState(false);
  const [aiSearchData, setAiSearchData] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch cart items
  async function fetchCart() {
    try {
      setCartLoading(true);
      const res = await fetch("/api/cart", {
        headers: { "x-cart-session-id": getCartSessionId() },
      });
      if (res.ok) {
        const data = await res.json();
        setCartItems(data);
      }
    } catch (err) {
      console.error("Failed to fetch cart:", err);
    } finally {
      setCartLoading(false);
    }
  }

  useEffect(() => {
    fetchCart();
    window.addEventListener("cart-updated", fetchCart);
    return () => {
      window.removeEventListener("cart-updated", fetchCart);
    };
  }, []);

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.quantity * (item.product?.price || 0), 0);

  // Text search handler
  const handleTextSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim()) return;
    router.push(`/products?search=${encodeURIComponent(searchText)}`);
  };

  // Image search handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setAiLoading(true);
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/ai-search", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Visual search failed");

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAiSearchData(data);
      setIsSearchPopupOpen(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to analyze image with AI.");
    } finally {
      setAiLoading(false);
    }
  };

  // Cart operations
  async function updateQuantity(productId: number, setQuantity: number) {
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cart-session-id": getCartSessionId(),
        },
        body: JSON.stringify({ productId, setQuantity }),
      });
      if (res.ok) {
        fetchCart();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function removeCartItem(productId: number) {
    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-cart-session-id": getCartSessionId(),
        },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        fetchCart();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function clearCart() {
    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-cart-session-id": getCartSessionId(),
        },
        body: JSON.stringify({ clear: true }),
      });
      if (res.ok) {
        fetchCart();
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ShopLens AI
            </Link>
            <Link href="/admin" className="hidden sm:inline-block text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
              Admin Console
            </Link>
          </div>

          {/* Search bar */}
          <form onSubmit={handleTextSearch} className="flex-1 max-w-md relative flex items-center">
            <div className="relative w-full">
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search products, brands..."
                className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-600 rounded-full pl-5 pr-20 py-2.5 text-sm outline-none transition-all placeholder:text-gray-400"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {/* Upload Image Icon (Camera) */}
                <label className="cursor-pointer p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-600 transition-colors flex items-center justify-center">
                  {aiLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={aiLoading} />
                </label>

                {/* Text Search Submit Icon */}
                <button type="submit" className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-600 transition-colors flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </form>

          {/* Navigation & Cart Trigger */}
          <nav className="flex items-center gap-4">
            <Link href="/products" className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
              Products
            </Link>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {totalCartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white font-bold text-[10px] h-4 w-4 rounded-full flex items-center justify-center shadow-md animate-bounce">
                  {totalCartCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Visual Search AI Popup */}
      <SearchPopup
        isOpen={isSearchPopupOpen}
        onClose={() => {
          setIsSearchPopupOpen(false);
          setAiSearchData(null);
        }}
        initialData={aiSearchData}
        onCartUpdated={fetchCart}
      />

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Overlay */}
            <div
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md transform bg-white shadow-2xl transition-transform duration-300 ease-in-out">
                <div className="flex h-full flex-col overflow-y-scroll bg-white">
                  {/* Drawer Header */}
                  <div className="flex items-start justify-between px-6 py-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900" id="slide-over-title">
                      Shopping Cart
                    </h2>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Drawer Content */}
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {cartItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                          />
                        </svg>
                        <p className="text-sm font-medium">Your cart is empty.</p>
                        <button
                          onClick={() => setIsCartOpen(false)}
                          className="mt-4 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Continue shopping
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {cartItems.map((item) => (
                          <div key={item.id} className="flex py-4 border-b border-gray-100 gap-4">
                            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border bg-gray-50 flex items-center justify-center">
                              {item.product?.image ? (
                                <img
                                  src={item.product.image}
                                  alt={item.product.name}
                                  className="h-full w-full object-contain p-1"
                                  onError={(e) => {
                                    (e.target as any).src = "/placeholder.jpg";
                                  }}
                                />
                              ) : (
                                <div className="text-[10px] text-gray-400">No image</div>
                              )}
                            </div>

                            <div className="flex flex-1 flex-col">
                              <div>
                                <div className="flex justify-between text-sm font-semibold text-gray-900">
                                  <h3 className="truncate max-w-[180px]">{item.product?.name}</h3>
                                  <p className="ml-4">₹{((item.product?.price || 0) * item.quantity).toFixed(2)}</p>
                                </div>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {item.product?.brand} • {item.product?.color}
                                </p>
                              </div>
                              <div className="flex flex-1 items-end justify-between text-xs mt-2">
                                <div className="flex items-center border rounded-full px-2 py-0.5 gap-2 bg-gray-50">
                                  <button
                                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                    className="p-1 text-gray-500 hover:text-black font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="font-semibold">{item.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                    className="p-1 text-gray-500 hover:text-black font-bold"
                                  >
                                    +
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeCartItem(item.productId)}
                                  className="font-medium text-red-500 hover:text-red-700 transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Drawer Footer */}
                  {cartItems.length > 0 && (
                    <div className="border-t border-gray-100 px-6 py-6 bg-gray-50">
                      <div className="flex justify-between text-base font-semibold text-gray-900">
                        <p>Subtotal</p>
                        <p>₹{cartSubtotal.toFixed(2)}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">Taxes and shipping calculated at checkout.</p>
                      <div className="mt-6 flex flex-col gap-2">
                        <button
                          onClick={() => {
                            alert("Checkout success! Thank you for buying.");
                            clearCart();
                            setIsCartOpen(false);
                          }}
                          className="flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
                        >
                          Checkout
                        </button>
                        <button
                          onClick={clearCart}
                          className="flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Clear Cart
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
