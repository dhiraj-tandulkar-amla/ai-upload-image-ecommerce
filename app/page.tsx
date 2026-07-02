"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function HomePage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  // const [imageName, setImageName] = useState("");

  const handleSearch = () => {
    if (!searchText.trim()) return;
    router.push(`/products?search=${searchText}`);
  };

  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    // Step 1: AI identifies the product
    // const aiResponse = await fetch("/api/ai-search", {
    //   method: "POST",
    //   body: formData,
    // });

    // const aiData = await aiResponse.json();
    const aiData = {
      brand: "dewalt",
      category: "drill",
      color: "yellow"
    }


    console.log(aiData);

    // Example:
    // {
    //   brand: "dewalt",
    //   category: "drill",
    //   color: "yellow"
    // }

    // Step 2: Search products
    const productResponse = await fetch("/api/products", {
      method: "POST",
      body: JSON.stringify({
        search: aiData.brand,
      }),
    });

    const productData = await productResponse.json();

    console.log(productData);

    // Step 3:
    // Save in Zustand/Context or navigate with state
  };

  return (
    <Layout>
      <section className="mx-auto flex max-w-7xl flex-1 items-center px-6 py-16">
        <div className="w-full rounded-2xl bg-blue-50 p-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900">
            AI Powered Product Search
          </h1>

          <p className="mt-4 text-gray-600">
            Upload a product image and AI will detect category, color, and brand.
          </p>

          <div className="mx-auto mt-8 flex max-w-2xl gap-3">
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
            />

            <button
              onClick={handleSearch}
              className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          <div className="mt-8">
            <label className="inline-block cursor-pointer rounded-lg bg-gray-900 px-6 py-3 text-white hover:bg-black">
              Upload Product Image
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

            {/* {imageName && (
              <p className="mt-3 text-sm text-gray-600">
                Uploaded: {imageName}
              </p>
            )} */}
          </div>
        </div>
      </section>
    </Layout>
  );
}