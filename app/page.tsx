"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import images from "@/public/images/Image.png";

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
      <div className="lg:flex justify-center">
        <section
          className=" px-6 py-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${images.src})` }}
        >
          <div className="relative overflow-hidden rounded-3xl from-blue-50 via-white to-indigo-50 shadow-xl border border-blue-100">
            <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-200 opacity-20 blur-3xl"></div>
            <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-indigo-200 opacity-20 blur-3xl"></div>

            <div className="relative grid items-center gap-10 lg:grid-cols-2 p-10 lg:p-16 bg-white/40 backdrop-blur-sm lg:bg-white/10 lg:backdrop-blur-none">
              <div>
                <span className="inline-flex rounded-full bg-blue-100 px-4 py-1 text-sm font-semibold text-blue-700">
                  AI Powered Search
                </span>

                <h1 className="mt-5 text-5xl font-extrabold leading-tight text-gray-900">
                  Find Products
                  <span className="block text-blue-600">Using Image</span>
                </h1>

                <p className="mt-5 text-lg text-gray-600">
                  Upload a product image or search by keyword. Our AI instantly
                  identifies the
                  <strong> category</strong>,<strong> brand</strong>,
                  <strong> color</strong>, and finds similar products.
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="🔍 Search products..."
                    className="flex-1 rounded-xl border border-gray-300 bg-white px-5 py-4 text-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  />

                  <button
                    onClick={handleSearch}
                    className="rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg"
                  >
                    Search
                  </button>
                </div>

                <div className="mt-8">
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                      <span className="font-medium text-gray-600">
                        {statusText}
                      </span>
                    </div>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl bg-gray-900 px-7 py-4 font-semibold text-white transition hover:bg-black">
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

                <div className="mt-8 flex flex-wrap gap-5 text-sm font-medium text-gray-600">
                  <span>✅ Category Detection</span>
                  <span>✅ Brand Recognition</span>
                  <span>✅ Color Identification</span>
                  <span>✅ Similar Products</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
