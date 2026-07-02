"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ComparePopup from "@/components/ComparePopup";
import productsData from "@/data/products.json";
import { Product } from "@/types/product";

const products = productsData as Product[];

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

    const pageSize = 4;

    useEffect(() => {
        const currentSearch = search;
        if (!currentSearch) {
            setDynamicProducts(products);
            return;
        }

        async function fetchProducts() {
            const query = currentSearch || "";
            try {
                setLoading(true);
                const res = await fetch("/api/products", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ search: query }),
                });

                if (!res.ok) throw new Error("Search API error");
                const rawData = await res.json();
                const data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;

                let list: any[] = [];
                if (data) {
                    if (Array.isArray(data)) {
                        list = data;
                    } else if (data.Products && Array.isArray(data.Products)) {
                        list = data.Products;
                    } else if (data.products && Array.isArray(data.products)) {
                        list = data.products;
                    }
                }

                if (list.length > 0) {
                    const mapped: Product[] = list.map((item: any) => {
                        // Find Brand from Attributes SelectValues
                        const brandAttr = item.Attributes?.find(
                            (a: any) => a.AttributeCode?.toLowerCase() === "brand"
                        );
                        const brandValue = brandAttr?.SelectValues?.[0]?.Value || item.BrandName || item.brand || "ZNode";

                        // Find Color from Attributes SelectValues or values
                        const colorAttr = item.Attributes?.find(
                            (a: any) => a.AttributeCode?.toLowerCase() === "color"
                        );
                        const colorValue = colorAttr?.SelectValues?.[0]?.Value || colorAttr?.AttributeValues || item.color || "N/A";

                        // Parse price - handle if it's negative or null
                        let priceValue = 0;
                        if (typeof item.RetailPrice === "number" && item.RetailPrice > 0) {
                            priceValue = item.RetailPrice;
                        } else if (typeof item.ProductPrice === "number" && item.ProductPrice > 0) {
                            priceValue = item.ProductPrice;
                        } else if (typeof item.SalesPrice === "number" && item.SalesPrice > 0) {
                            priceValue = item.SalesPrice;
                        } else if (item.price && item.price > 0) {
                            priceValue = item.price;
                        }

                        return {
                            id: item.ZnodeProductId || item.PublishProductId || item.id || Math.random(),
                            name: item.Name || item.ProductName || "Unknown Product",
                            brand: brandValue,
                            category: item.CategoryName || item.category || "General",
                            color: colorValue,
                            price: priceValue,
                            image: item.ImageMediumPath || item.ImageSmallPath || item.image || "/placeholder.jpg",
                            rating: typeof item.Rating === "number" ? item.Rating : 4.0,
                        };
                    });
                    setDynamicProducts(mapped);
                } else {
                    // Fall back to local search
                    const filtered = products.filter((product) => {
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
                console.error("ZNode search error, falling back to local search:", err);
                const filtered = products.filter((product) => {
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
    }, [search]);

    const filteredProducts = dynamicProducts.filter((product) => {
        if (category && product.category.toLowerCase() !== category.toLowerCase()) return false;
        if (color && product.color.toLowerCase() !== color.toLowerCase()) return false;
        if (brand && product.brand.toLowerCase() !== brand.toLowerCase()) return false;
        return true;
    });

    const totalPages = Math.ceil(filteredProducts.length / pageSize);

    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

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
                <h1 className="text-3xl font-bold">Product List</h1>

                <p className="mt-2 text-gray-600">
                    Showing products based on AI/search filters.
                </p>

                {loading ? (
                    <div className="mt-16 flex flex-col items-center justify-center gap-2">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                        <p className="text-gray-500">Searching products from ZNode catalog...</p>
                    </div>
                ) : (
                    <>
                        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {paginatedProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onCompare={addToCompare}
                                />
                            ))}
                        </div>

                        {paginatedProducts.length === 0 && (
                            <p className="mt-10 text-center text-gray-500">
                                No products found.
                            </p>
                        )}
                    </>
                )}

                <div className="mt-8 flex justify-center gap-3">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => prev - 1)}
                        className="rounded border px-4 py-2 disabled:opacity-50"
                    >
                        Prev
                    </button>

                    <span className="px-4 py-2">
                        Page {currentPage} of {totalPages || 1}
                    </span>

                    <button
                        disabled={currentPage === totalPages || totalPages === 0}
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        className="rounded border px-4 py-2 disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </main>

            <ComparePopup
                products={compareProducts}
                onRemove={removeFromCompare}
            />

            <Footer />
        </>
    );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={
            <>
                <Header />
                <main className="mx-auto max-w-7xl px-6 py-10">
                    <h1 className="text-3xl font-bold">Product List</h1>
                    <p className="mt-2 text-gray-600">Loading products...</p>
                </main>
                <Footer />
            </>
        }>
            <ProductsPageContent />
        </Suspense>
    );
}