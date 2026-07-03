"use client";

import Link from "next/link";
import Layout from "@/components/Layout";

export default function HomePage() {
  return (
    <Layout>
      <section className="mx-auto flex max-w-7xl flex-1 flex-col items-center justify-center px-6 py-20 text-center relative overflow-hidden">
        {/* Decorative background gradients */}
        <div className="absolute -top-40 right-10 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-80 -left-20 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-3xl">
          <h1 className="text-6xl font-extrabold tracking-tight text-gray-900 leading-none">
            The Smartest Way to <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Discover Products
            </span>
          </h1>

          <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Search products using natural conversational commands or by uploading a photo. Experience instant visual matching, bundle item detection, and fluid checkout.
          </p>

          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <Link
              href="/products"
              className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base px-8 py-4 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
            >
              Explore Catalog &rarr;
            </Link>
            <Link
              href="/admin"
              className="rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-base px-8 py-4 shadow-xs transition-all hover:scale-[1.02] cursor-pointer"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-5xl">
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-gray-100 p-6 shadow-xs text-left">
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-4">
              📷
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Visual Search</h3>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              Click the camera icon in the search bar above to upload any product image. AI identifies it in seconds.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-gray-100 p-6 shadow-xs text-left">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg mb-4">
              📦
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Bundle Detection</h3>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              Upload bundle or combo images. Our system identifies individual pieces and lets you add the whole set at once.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-gray-100 p-6 shadow-xs text-left">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-lg mb-4">
              💬
            </div>
            <h3 className="font-bold text-gray-900 text-lg">NLP Refinement</h3>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              Refine your image results using chat instructions like "make it red", "show nike only", or "add a watch".
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}