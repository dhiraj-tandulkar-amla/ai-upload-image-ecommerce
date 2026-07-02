"use client";

import Link from "next/link";
import { Product } from "@/types/product";

interface Props {
    products: Product[];
    onRemove: (id: number) => void;
}

export default function ComparePopup({ products, onRemove }: Props) {
    if (products.length === 0) return null;

    return (
        <div className="fixed bottom-5 right-5 z-50 w-80 rounded-xl bg-white p-4 shadow-2xl">
            <h3 className="font-bold">Compare Products</h3>

            <div className="mt-3 space-y-2">
                {products.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                        <span>{item.name}</span>
                        <button
                            onClick={() => onRemove(item.id)}
                            className="text-red-500"
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </div>

            <Link
                href="/compare"
                className="mt-4 block rounded-lg bg-blue-600 py-2 text-center text-white"
            >
                Compare Now
            </Link>
        </div>
    );
}