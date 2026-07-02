"use client";

import { Product } from "@/types/product";

interface Props {
    product: Product;
    onCompare: (product: Product) => void;
}

export default function ProductCard({ product, onCompare }: Props) {
    return (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex h-44 items-center justify-center rounded-lg bg-gray-100">
                <span className="text-sm text-gray-500">{product.name}</span>
            </div>

            <h3 className="mt-4 font-semibold">{product.name}</h3>

            <p className="text-sm text-gray-500">
                {product.brand} • {product.color} • {product.category}
            </p>

            <p className="mt-2 font-bold text-blue-600">₹{product.price}</p>

            <button
                onClick={() => onCompare(product)}
                className="mt-4 w-full rounded-lg border border-blue-600 py-2 text-blue-600"
            >
                Add to Compare
            </button>
        </div>
    );
}