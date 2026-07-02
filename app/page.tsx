"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function HomePage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const handleSearch = () => {
    if (!searchText.trim()) return;
    router.push(`/products?search=${searchText}`);
  };

  const handleImageUpload = async (file: File) => {
    try {
      setLoading(true);
      setStatusText("Analyzing image...");

      const formData = new FormData();
      formData.append("image", file);

      const aiResponse = await fetch("/api/ai-search", {
        method: "POST",
        body: formData,
      });

      if (!aiResponse.ok) {
        throw new Error(`Failed to upload: ${aiResponse.statusText}`);
      }

      const aiData = await aiResponse.json();

      if (aiData.error) {
        throw new Error(aiData.error);
      }

      if (aiData.keyword) {
        setStatusText(`Found: "${aiData.keyword}". Redirecting...`);
        router.push(`/products?search=${encodeURIComponent(aiData.keyword)}`);
      } else {
        throw new Error("No search keyword returned from AI");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred during AI search.");
      setLoading(false);
      setStatusText("");
    }
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
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="text-sm text-gray-600 font-medium">{statusText}</p>
              </div>
            ) : (
              <label className="inline-block cursor-pointer rounded-lg bg-gray-900 px-6 py-3 text-white hover:bg-black transition-colors">
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
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}