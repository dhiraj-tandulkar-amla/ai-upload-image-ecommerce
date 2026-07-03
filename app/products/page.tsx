"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ComparePopup from "@/components/ComparePopup";
import productsData from "@/data/products.json";
import { Product } from "@/types/product";
import { formatProductImage } from "@/lib/utils";

const localFallbackProducts = productsData as Product[];

function ProductsPageContent() {
  const searchParams = useSearchParams();

  const category = searchParams.get("category");
  const color = searchParams.get("color");
  const brand = searchParams.get("brand");
  const search = searchParams.get("search");

  const [currentPage, setCurrentPage] = useState(1);
  const [compareProducts, setCompareProducts] = useState<Product[]>([]);
  const [dynamicProducts, setDynamicProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const pageSize = 8; // Modern pagination size

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ search: search || "" }),
        });

        if (!res.ok) throw new Error("Search API error");
        const data = await res.json();

        let list: any[] = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (data.products && Array.isArray(data.products)) {
          list = data.products;
        }

        if (list.length > 0) {
          const mapped: Product[] = list.map((item: any) => {
            return {
              id: item.id || Math.random(),
              name: item.name || "Unknown Product",
              brand: item.brand || "N/A",
              category: item.category || "General",
              color: item.color || "N/A",
              price: parseFloat(item.price) || 0,
              image: formatProductImage(item.image),
              rating: typeof item.rating === "number" ? item.rating : parseFloat(item.rating) || 4.0,
            };
          });
          setDynamicProducts(mapped);
        } else {
          // Fall back to local search in products.json
          const query = search || "";
          const filtered = localFallbackProducts.filter((product) => {
            const searchWords = query.toLowerCase().split(/\s+/).filter(Boolean);
            return searchWords.every((word) => {
              return (
                product.name.toLowerCase().includes(word) ||
                product.brand.toLowerCase().includes(word) ||
                product.category.toLowerCase().includes(word) ||
                product.color.toLowerCase().includes(word)
              );
            });
          });
          setDynamicProducts(filtered);
        }
      } catch (err) {
        console.error("Local search error, falling back to products.json:", err);
        const query = search || "";
        const filtered = localFallbackProducts.filter((product) => {
          const searchWords = query.toLowerCase().split(/\s+/).filter(Boolean);
          return searchWords.every((word) => {
            return (
              product.name.toLowerCase().includes(word) ||
              product.brand.toLowerCase().includes(word) ||
              product.category.toLowerCase().includes(word) ||
              product.color.toLowerCase().includes(word)
            );
          });
        });
        setDynamicProducts(filtered);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
    setCurrentPage(1); // Reset page on query search
  }, [search]);

  const filteredProducts = dynamicProducts.filter((product) => {
    if (category && product.category.toLowerCase() !== category.toLowerCase()) return false;
    if (color && product.color.toLowerCase() !== color.toLowerCase()) return false;
    if (brand && product.brand.toLowerCase() !== brand.toLowerCase()) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredProducts.length / pageSize);

  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const addToCompare = (product: Product) => {
    setCompareProducts((prev) => {
      const alreadyAdded = prev.some((item) => item.id === product.id);
      if (alreadyAdded || prev.length >= 3) return prev;
      return [...prev, product];
    });
  };

  const removeFromCompare = (id: number) => {
    setCompareProducts((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Catalogue</h1>
            <p className="mt-1 text-sm text-gray-500">Explore products from our active database.</p>
          </div>
        </div>

        {loading ? (
          <div className="mt-16 flex flex-col items-center justify-center gap-2">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-gray-500">Searching products from database...</p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} onCompare={addToCompare} />
              ))}
            </div>

            {paginatedProducts.length === 0 && (
              <p className="mt-16 text-center text-gray-500 font-medium">No products found matching your search.</p>
            )}
          </>
        )}

        {totalPages > 1 && (
          <div className="mt-12 flex justify-center items-center gap-3">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="rounded-xl border hover:bg-gray-50 px-4 py-2 disabled:opacity-30 disabled:hover:bg-transparent font-medium text-sm transition-colors cursor-pointer"
            >
              Prev
            </button>

            <span className="text-sm font-semibold text-gray-700">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="rounded-xl border hover:bg-gray-50 px-4 py-2 disabled:opacity-30 disabled:hover:bg-transparent font-medium text-sm transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </main>

      <ComparePopup products={compareProducts} onRemove={removeFromCompare} />

      <Footer />
    </>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <main className="mx-auto max-w-7xl px-6 py-10">
            <h1 className="text-3xl font-bold">Product List</h1>
            <p className="mt-2 text-gray-600">Loading products...</p>
          </main>
          <Footer />
        </>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}