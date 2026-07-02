"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ComparePopup from "@/components/ComparePopup";
import productsData from "@/data/products.json";
import { Product } from "@/types/product";

const products = productsData as Product[];

export default function ProductsPage() {
    const searchParams = useSearchParams();

    const category = searchParams.get("category");
    const color = searchParams.get("color");
    const brand = searchParams.get("brand");
    const search = searchParams.get("search");

    const [currentPage, setCurrentPage] = useState(1);
    const [compareProducts, setCompareProducts] = useState<Product[]>([]);

    const pageSize = 4;

    const filteredProducts = products.filter((product) => {
        if (category && product.category !== category) return false;
        if (color && product.color !== color) return false;
        if (brand && product.brand !== brand) return false;

        if (
            search &&
            !product.name.toLowerCase().includes(search.toLowerCase())
        ) {
            return false;
        }

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