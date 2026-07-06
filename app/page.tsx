"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Layout from "@/components/Layout";
import images from "@/public/images/Image.png";
import { formatProductImage } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [selectedDemo, setSelectedDemo] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Fetch products from database
  useEffect(() => {
    async function loadProducts() {
      try {
        setLoadingProducts(true);
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ search: "" }),
        });
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : Array.isArray(data.products) ? data.products : [];
          if (list.length > 0) {
            const mapped = list.slice(0, 5).map((p: any) => ({
              id: p.id,
              label: p.category ? `📦 ${p.category.charAt(0).toUpperCase() + p.category.slice(1)}` : "📦 Item",
              name: p.name,
              brand: p.brand || "Unknown",
              color: p.color || "Unknown",
              category: p.category || "General",
              price: `₹${parseFloat(p.price).toLocaleString()}`,
              imageUrl: formatProductImage(p.image),
              tags: [p.brand, p.color, p.category].filter(Boolean),
              boxStyle: { top: "25%", left: "25%", width: "50%", height: "50%" }
            }));
            setDbProducts(mapped);
            setSelectedDemo(mapped[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load homepage products", err);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadProducts();
  }, []);

  // Trigger scanning animation
  useEffect(() => {
    if (selectedDemo) {
      setIsScanning(true);
      const timer = setTimeout(() => setIsScanning(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [selectedDemo]);

  const handleSearch = () => {
    if (!searchText.trim()) return;
    router.push(`/products?search=${encodeURIComponent(searchText)}`);
  };

  const handleImageUpload = async (file: File) => {
    try {
      setLoading(true);
      setStatusText("Analyzing image...");
      
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/ai-search", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      
      // Navigate to products with search results or query
      if (data.description) {
        router.push(`/products?search=${encodeURIComponent(data.description)}`);
      } else {
        router.push("/products");
      }
    } catch (err) {
      console.error(err);
      setStatusText("Failed to analyze image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 0.8; }
        }
        .scan-line {
          animation: scan 2.5s linear infinite;
        }
      `}</style>

      <div className="lg:flex justify-center w-full min-h-[80vh] items-center bg-gray-50/50">
        <section
          className="px-4 py-12 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat w-full flex justify-center"
          style={{ backgroundImage: `url(${images.src})` }}
        >
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50/90 via-white/95 to-indigo-50/95 shadow-2xl border border-blue-100/50 max-w-7xl w-full">
            <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-blue-200 opacity-20 blur-3xl"></div>
            <div className="absolute -bottom-24 -left-20 h-96 w-96 rounded-full bg-indigo-200 opacity-20 blur-3xl"></div>

            <div className="relative grid items-center gap-12 lg:grid-cols-2 p-8 sm:p-12 lg:p-16">
              
              {/* Left Column: Title & Actions */}
              <div className="space-y-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/80 px-4 py-1.5 text-xs font-semibold text-blue-700 backdrop-blur-xs border border-blue-200/50 uppercase tracking-wider">
                  ⚡ ShopLens AI Search
                </span>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight text-gray-900 tracking-tight">
                  Discover Products <br />
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Using Visual AI
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">
                  Upload a photo of any item or search with keywords. Our advanced computer vision model instantly extracts the category, brand, and color to display the closest matching store catalog items.
                </p>

                {/* Text search bar */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row max-w-lg">
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="🔍 Search products by name, brand, or color..."
                    className="flex-1 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-base shadow-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  />

                  <button
                    onClick={handleSearch}
                    className="rounded-2xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Search</span>
                  </button>
                </div>

                {/* File Upload action */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  {loading ? (
                    <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl border">
                      <div className="h-5 w-5 animate-spin rounded-full border-3 border-blue-600 border-t-transparent"></div>
                      <span className="font-semibold text-sm text-gray-700">
                        {statusText}
                      </span>
                    </div>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-gray-900 hover:bg-black px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg active:scale-98">
                      📤 Upload Product Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file);
                        }}
                      />
                    </label>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-gray-500">
                  <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-gray-100">✔ Category Detection</span>
                  <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-gray-100">✔ Brand Recognition</span>
                  <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-gray-100">✔ Color Identification</span>
                  <span className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-gray-100">✔ Similar Matching</span>
                </div>
              </div>

              {/* Right Column: Interactive AI Scanning Visualizer */}
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="w-full max-w-md bg-white/70 backdrop-blur-md rounded-3xl border border-white/50 p-6 shadow-2xl relative overflow-hidden flex flex-col min-h-[350px] justify-center">
                  
                  {loadingProducts ? (
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                      <p className="text-sm font-medium text-gray-500">Loading catalog items...</p>
                    </div>
                  ) : dbProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                      <div className="text-4xl">⚠️</div>
                      <h4 className="text-base font-bold text-gray-950">Database Catalog Empty</h4>
                      <p className="text-xs text-gray-500 max-w-xs">
                        There are no products initialized in the database. Please visit the admin console to set up the database and import sample products.
                      </p>
                      <Link
                        href="/admin"
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 shadow-sm transition-colors cursor-pointer"
                      >
                        Go to Admin Console &rarr;
                      </Link>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">AI Visualizer Demo</p>
                      
                      {/* Photo scanning frame */}
                      <div className="relative h-64 w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center">
                        <img
                          src={selectedDemo.imageUrl}
                          alt={selectedDemo.name}
                          className="h-full w-full object-contain p-4 transition-opacity duration-300"
                        />

                        {/* Scanning animation bar */}
                        {isScanning && (
                          <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-50 to-transparent shadow-lg shadow-blue-50/80 scan-line" />
                        )}

                        {/* Detection Bounding Box */}
                        {!isScanning && (
                          <div
                            className="absolute border-2 border-dashed border-emerald-500 rounded-lg flex flex-col justify-between p-1 bg-emerald-500/10 transition-all duration-500"
                            style={selectedDemo.boxStyle}
                          >
                            <span className="bg-emerald-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-sm absolute -top-5 left-0 shadow-sm border border-emerald-500 whitespace-nowrap">
                              {selectedDemo.brand} {selectedDemo.category} (98% match)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Demo items selector */}
                      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 max-w-full">
                        {dbProducts.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setSelectedDemo(item)}
                            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                              selectedDemo.id === item.id
                                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      {/* Attributes Details Panel */}
                      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{selectedDemo.name}</h4>
                          <div className="flex gap-1.5 mt-1.5 flex-wrap">
                            {selectedDemo.tags.map((tag: string, idx: number) => (
                              <span key={idx} className="bg-gray-100 text-[10px] font-semibold text-gray-600 px-2 py-0.5 rounded-md">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-xs text-gray-400 font-medium font-sans">Price</p>
                          <p className="text-lg font-bold text-blue-600">{selectedDemo.price}</p>
                        </div>
                      </div>

                      {/* Action CTA */}
                      <button
                        onClick={() => router.push(`/products?search=${encodeURIComponent(selectedDemo.name)}`)}
                        className="mt-6 w-full rounded-2xl bg-gray-900 hover:bg-black text-white font-semibold text-sm py-3 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>Search Similar items &rarr;</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
