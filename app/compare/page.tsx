"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Product } from "@/types/product";
import { formatProductImage } from "@/lib/utils";

interface ChatMessage {
  sender: "user" | "assistant";
  text: string;
}

function ComparePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idsParam = searchParams.get("ids") || "";

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      sender: "assistant",
      text: "Hello! I am your visual comparison assistant. Ask me questions like 'Which has the best value?' or 'Compare the differences between these items.'",
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      if (!idsParam) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const idList = idsParam
        .split(",")
        .map((id) => parseInt(id, 10))
        .filter(Boolean);

      try {
        setLoading(true);
        const res = await fetch("/api/compare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: idList }),
        });

        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (err) {
        console.error("Failed to load products for comparison:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [idsParam]);

  // Handle conversational chat submission
  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading || products.length < 2) return;

    const userText = chatMessage;
    setChatMessage("");
    setChatHistory((prev) => [...prev, { sender: "user", text: userText }]);
    setChatLoading(true);

    try {
      const historyPayload = chatHistory.map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

      const res = await fetch("/api/compare/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products,
          message: userText,
          history: historyPayload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatHistory((prev) => [...prev, { sender: "assistant", text: data.reply }]);
      } else {
        const errData = await res.json();
        setChatHistory((prev) => [
          ...prev,
          { sender: "assistant", text: `Error: ${errData.error || "Failed to get reply."}` },
        ]);
      }
    } catch (err) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        { sender: "assistant", text: "Error: Unable to connect to the comparison assistant." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  // Get list of unique custom attribute names across all selected products
  const getAllAttributeKeys = () => {
    const keys = new Set<string>();
    products.forEach((p) => {
      if (p.attributes) {
        Object.keys(p.attributes).forEach((k) => keys.add(k));
      }
    });
    return Array.from(keys);
  };

  const attributeKeys = getAllAttributeKeys();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-[60vh] justify-center items-center gap-2">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-gray-500 font-medium">Gathering comparison details...</p>
      </div>
    );
  }

  // Suitable Restrictions: Must compare at least 2 products to use comparison
  if (products.length < 2) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-20 px-6 max-w-xl mx-auto text-center">
        <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-2xl mb-6">
          ⚖️
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Compare Products</h2>
        <p className="text-gray-500 text-sm mt-2 leading-relaxed">
          Comparison requires at least **2 products** (max 3) to show details and chat with the AI assistant. 
          Please browse the store and add products to comparison.
        </p>
        <button
          onClick={() => router.push("/products")}
          className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow transition-colors cursor-pointer"
        >
          Go to Catalogue
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 flex-1 flex flex-col md:flex-row gap-8">
      {/* Left Column: Comparison Matrix Table */}
      <div className="flex-1 overflow-x-auto min-w-0 bg-white rounded-3xl border border-gray-100 shadow-xs p-6 self-start">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Side-by-Side Comparison</h1>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-4 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider w-1/4">Features</th>
              {products.map((product) => (
                <th key={product.id} className="py-4 px-4 font-bold text-gray-900 text-sm text-center w-1/4">
                  <div className="h-28 w-28 bg-gray-50 rounded-2xl overflow-hidden mx-auto border flex items-center justify-center mb-2">
                    <img
                      src={formatProductImage(product.image)}
                      alt={product.name}
                      className="h-full w-full object-contain p-1"
                      onError={(e) => {
                        (e.target as any).src = "/placeholder.svg";
                      }}
                    />
                  </div>
                  <span className="line-clamp-2">{product.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {/* Price */}
            <tr>
              <td className="py-4 pr-4 font-semibold text-gray-500">Price</td>
              {products.map((product) => (
                <td key={product.id} className="py-4 px-4 text-center font-bold text-blue-600 text-base">
                  ₹{product.price}
                </td>
              ))}
            </tr>

            {/* Brand */}
            <tr>
              <td className="py-4 pr-4 font-semibold text-gray-500">Brand</td>
              {products.map((product) => (
                <td key={product.id} className="py-4 px-4 text-center text-gray-800 font-medium">
                  {product.brand}
                </td>
              ))}
            </tr>

            {/* Category */}
            <tr>
              <td className="py-4 pr-4 font-semibold text-gray-500">Category</td>
              {products.map((product) => (
                <td key={product.id} className="py-4 px-4 text-center text-gray-600">
                  {product.category}
                </td>
              ))}
            </tr>

            {/* Rating */}
            <tr>
              <td className="py-4 pr-4 font-semibold text-gray-500">Rating</td>
              {products.map((product) => (
                <td key={product.id} className="py-4 px-4 text-center text-gray-800 font-semibold">
                  ⭐ {product.rating || "4.0"}
                </td>
              ))}
            </tr>

            {/* Color */}
            <tr>
              <td className="py-4 pr-4 font-semibold text-gray-500">Color</td>
              {products.map((product) => (
                <td key={product.id} className="py-4 px-4 text-center text-gray-600">
                  {product.color}
                </td>
              ))}
            </tr>

            {/* Size */}
            <tr>
              <td className="py-4 pr-4 font-semibold text-gray-500">Size</td>
              {products.map((product) => (
                <td key={product.id} className="py-4 px-4 text-center text-gray-600">
                  {product.size}
                </td>
              ))}
            </tr>

            {/* Description */}
            <tr>
              <td className="py-4 pr-4 font-semibold text-gray-500">Description</td>
              {products.map((product) => (
                <td key={product.id} className="py-4 px-4 text-center text-xs text-gray-500 leading-relaxed max-w-[200px]">
                  {product.description || "N/A"}
                </td>
              ))}
            </tr>

            {/* Dynamic CSV Custom Attributes */}
            {attributeKeys.map((key) => (
              <tr key={key}>
                <td className="py-4 pr-4 font-semibold text-gray-500 capitalize">{key.replace(/_/g, " ")}</td>
                {products.map((product) => (
                  <td key={product.id} className="py-4 px-4 text-center text-xs text-gray-600">
                    {product.attributes?.[key] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Right Column: AI Assistant Chat Interface */}
      <div className="w-full md:w-80 flex-shrink-0 bg-gray-50 rounded-3xl border border-gray-100 p-6 flex flex-col h-[550px] shadow-xs">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-950 flex items-center gap-1.5">
            <span>💬</span> AI Compare Agent
          </h2>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-normal">
            Ask questions about the compared items. The bot is locked to these items.
          </p>
        </div>

        {/* Message Log */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 mb-4">
          {chatHistory.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white font-medium rounded-tr-none"
                    : "bg-white border border-gray-200 text-gray-800 rounded-tl-none"
                }`}
              >
                {/* Parse basic markdown bullet points for layout */}
                {msg.text.split("\n").map((line, lIdx) => {
                  if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
                    return (
                      <li key={lIdx} className="ml-3 list-disc mt-0.5">
                        {line.trim().substring(1).trim()}
                      </li>
                    );
                  }
                  return <p key={lIdx} className={lIdx > 0 ? "mt-1.5" : ""}>{line}</p>;
                })}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex items-center gap-2 text-xs text-gray-500 pl-1">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
              <span>Analyzing specifications...</span>
            </div>
          )}
        </div>

        {/* Chat Submission Form */}
        <form onSubmit={handleSendChat} className="flex gap-2 pt-3 border-t border-gray-200/50">
          <input
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="Ask AI about these items..."
            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-600 transition-colors"
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={chatLoading || !chatMessage.trim()}
            className="p-2 bg-gray-900 hover:bg-black text-white disabled:bg-gray-300 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 transform rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <>
      <Header />
      <Suspense
        fallback={
          <main className="flex-1 flex flex-col justify-center items-center min-h-[60vh]">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-gray-500 mt-2 font-medium">Loading comparison...</p>
          </main>
        }
      >
        <ComparePageContent />
      </Suspense>
      <Footer />
    </>
  );
}