"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AdminPage() {
  const [dbStatus, setDbStatus] = useState<any>({
    loading: true,
    connected: false,
    tables: { products: false, cart_items: false },
    productCount: 0,
    aiConnected: false,
    aiError: null,
    error: null,
  });

  const [setupLoading, setSetupLoading] = useState(false);
  const [setupResult, setSetupResult] = useState<string | null>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const [fixImagesLoading, setFixImagesLoading] = useState(false);
  const [fixImagesResult, setFixImagesResult] = useState<any>(null);
  const [brokenImageCount, setBrokenImageCount] = useState<number | null>(null);

  async function checkBrokenImages() {
    try {
      const res = await fetch("/api/fix-images");
      const data = await res.json();
      setBrokenImageCount(data.brokenImageCount ?? 0);
    } catch {
      setBrokenImageCount(null);
    }
  }

  async function handleFixImages() {
    try {
      setFixImagesLoading(true);
      setFixImagesResult(null);
      const res = await fetch("/api/fix-images", { method: "POST" });
      const data = await res.json();
      setFixImagesResult(data);
      await checkDbStatus();
      await checkBrokenImages();
    } catch (err: any) {
      setFixImagesResult({ success: false, error: err.message || "Request failed" });
    } finally {
      setFixImagesLoading(false);
    }
  }

  async function checkDbStatus() {
    try {
      setDbStatus((prev: any) => ({ ...prev, loading: true }));
      const res = await fetch("/api/setup-db");
      const data = await res.json();
      setDbStatus({
        loading: false,
        connected: data.connected,
        tables: data.tables || { products: false, cart_items: false },
        productCount: data.productCount || 0,
        aiConnected: data.aiConnected || false,
        aiError: data.aiError || null,
        error: data.error || null,
      });
    } catch (err: any) {
      setDbStatus({
        loading: false,
        connected: false,
        tables: { products: false, cart_items: false },
        productCount: 0,
        error: err.message || "Failed to load database status",
      });
    }
  }

  useEffect(() => {
    checkDbStatus();
    checkBrokenImages();
  }, []);

  async function handleSetupDb() {
    try {
      setSetupLoading(true);
      setSetupResult(null);
      const res = await fetch("/api/setup-db", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSetupResult("Success: Tables and indexes initialized!");
        await checkDbStatus();
      } else {
        setSetupResult(`Error: ${data.error || "Setup failed"}`);
      }
    } catch (err: any) {
      setSetupResult(`Error: ${err.message || "Request failed"}`);
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleImportCSV(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) return;

    try {
      setImportLoading(true);
      setImportResult(null);

      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch("/api/import-csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setImportResult(data);
      await checkDbStatus();
    } catch (err: any) {
      setImportResult({
        error: err.message || "Failed to import CSV",
      });
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-6 py-10 flex-1">
        <div className="flex items-center justify-between border-b pb-5 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your Supabase database and import product data.</p>
          </div>
          <Link href="/" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
            &larr; Back to Shop
          </Link>
        </div>

        {/* Fix Images Banner — shown when broken images are detected */}
        {brokenImageCount !== null && brokenImageCount > 0 && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div>
              <p className="text-sm font-bold text-amber-800">🖼️ {brokenImageCount} product{brokenImageCount !== 1 ? "s" : ""} have broken/missing images</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Amazon image URLs are stored in attributes but not set as the product image. Click to fix all at once.
              </p>
            </div>
            <button
              onClick={handleFixImages}
              disabled={fixImagesLoading}
              className="shrink-0 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {fixImagesLoading ? "Fixing..." : "Fix Images"}
            </button>
          </div>
        )}
        {fixImagesResult && (
          <div className={`mb-6 p-4 rounded-xl border text-sm ${fixImagesResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"}`}>
            {fixImagesResult.success
              ? `✅ Fixed ${fixImagesResult.fixedCount} product image${fixImagesResult.fixedCount !== 1 ? "s" : ""} successfully.`
              : `❌ Error: ${fixImagesResult.error}`}
          </div>
        )}

        {/* Database & OpenAI Connection Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Database Connection Status Card */}
          <section className="bg-white rounded-2xl border p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-950 mb-4 flex items-center gap-2">
                Database Status
                <span
                  className={`inline-block h-3 w-3 rounded-full ${
                    dbStatus.loading
                      ? "bg-gray-400"
                      : dbStatus.connected
                      ? "bg-emerald-500"
                      : "bg-red-500"
                  }`}
                />
              </h2>

              {dbStatus.loading && (
                <p className="text-sm text-gray-500">Checking connection...</p>
              )}

              {!dbStatus.loading && (
                <div>
                  {dbStatus.connected ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">
                        Connection URL: <span className="font-mono text-xs text-gray-900 bg-gray-100 px-1 py-0.5 rounded font-medium text-[11px] break-all">aws-1-ap-southeast-1.pooler.supabase.com</span>
                      </p>
                      <p className="text-sm font-medium text-gray-600">
                        Status: <span className="text-emerald-700 font-semibold">Connected</span>
                      </p>
                      <p className="text-sm font-medium text-gray-600">
                        Total Products: <span className="text-blue-600 font-bold">{dbStatus.productCount}</span>
                      </p>
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Tables Status:</p>
                        <div className="flex flex-col gap-1 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${dbStatus.tables.products ? "bg-emerald-500" : "bg-red-500"}`} />
                            <span>products {dbStatus.tables.products ? "(Ready)" : "(Missing)"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${dbStatus.tables.cart_items ? "bg-emerald-500" : "bg-red-500"}`} />
                            <span>cart_items {dbStatus.tables.cart_items ? "(Ready)" : "(Missing)"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
                      <p className="text-sm font-bold">Failed to connect to Supabase.</p>
                      <p className="text-xs mt-1 font-mono break-all">{dbStatus.error}</p>
                      <p className="text-xs mt-2">
                        Please ensure that your password is replaced correctly in <code className="bg-red-100 px-1 py-0.5 rounded">.env.local</code>.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!dbStatus.loading && dbStatus.connected && (!dbStatus.tables.products || !dbStatus.tables.cart_items) && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-800">Database tables missing.</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">Click Setup to initialize.</p>
                </div>
                <button
                  onClick={handleSetupDb}
                  disabled={setupLoading}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-semibold text-xs px-3 py-1.5 rounded-lg"
                >
                  {setupLoading ? "Setting up..." : "Setup"}
                </button>
              </div>
            )}

            {!dbStatus.loading && dbStatus.connected && dbStatus.tables.products && dbStatus.tables.cart_items && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSetupDb}
                  disabled={setupLoading}
                  className="border hover:bg-gray-50 text-gray-700 font-semibold text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  {setupLoading ? "Running..." : "Reset Tables"}
                </button>
              </div>
            )}

            {setupResult && (
              <div className={`mt-4 p-3 rounded-lg text-xs font-mono border ${setupResult.startsWith("Success") ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                {setupResult}
              </div>
            )}
          </section>

          {/* OpenAI API Key Status Card */}
          <section className="bg-white rounded-2xl border p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-950 mb-4 flex items-center gap-2">
                AI Service Status
                <span
                  className={`inline-block h-3 w-3 rounded-full ${
                    dbStatus.loading
                      ? "bg-gray-400"
                      : dbStatus.aiConnected
                      ? "bg-emerald-500"
                      : "bg-red-500"
                  }`}
                />
              </h2>

              {dbStatus.loading && (
                <p className="text-sm text-gray-500">Checking AI connection...</p>
              )}

              {!dbStatus.loading && (
                <div>
                  {dbStatus.aiConnected ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">
                        Status: <span className="text-emerald-700 font-semibold">Active & Working</span>
                      </p>
                      <p className="text-sm font-medium text-gray-600">
                        Model: <span className="font-mono text-xs text-gray-900 bg-gray-100 px-1 py-0.5 rounded">gpt-4.1</span>
                      </p>
                      <p className="text-xs text-gray-400 leading-relaxed mt-2">
                        AI search, bundle identification, and comparison chat features are fully operational.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
                      <p className="text-sm font-bold">AI Connection Failed.</p>
                      <p className="text-xs mt-1 font-mono break-all">{dbStatus.aiError || "API Key missing or invalid"}</p>
                      <p className="text-xs mt-2">
                        Ensure your <code className="bg-red-100 px-1 py-0.5 rounded">OPENAI_API_KEY</code> and <code className="bg-red-100 px-1 py-0.5 rounded">OPENAI_BASE_URL</code> are configured in <code className="bg-red-100 px-1 py-0.5 rounded">.env.local</code>.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* CSV Import Card */}
        {dbStatus.connected && dbStatus.tables.products && (
          <section className="bg-white rounded-2xl border p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950 mb-2">Import Products via CSV</h2>
            <p className="text-sm text-gray-500 mb-6">
              Upload a CSV file containing your product list. The importer maps columns matching <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-xs">name, sku, price, category, brand, color, size, image, rating, description</code>, and puts other columns inside a flexible JSON attributes column.
            </p>

            <form onSubmit={handleImportCSV} className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors rounded-xl p-8 text-center bg-gray-50 cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-2 text-sm font-semibold text-gray-700">
                  {importFile ? importFile.name : "Click to upload or drag & drop CSV file"}
                </p>
                {importFile && (
                  <p className="mt-1 text-xs text-gray-500">{(importFile.size / 1024).toFixed(2)} KB</p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!importFile || importLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-sm px-6 py-2.5 rounded-lg shadow transition-colors"
                >
                  {importLoading ? "Importing Products..." : "Upload & Import"}
                </button>
              </div>
            </form>

            {importResult && (
              <div className="mt-6 border rounded-xl overflow-hidden text-sm bg-gray-50">
                <div className="bg-gray-100 border-b px-4 py-3 font-semibold text-gray-800">
                  Import Summary
                </div>
                <div className="p-4 space-y-2">
                  {importResult.error ? (
                    <p className="text-red-600 font-semibold">{importResult.error}</p>
                  ) : (
                    <>
                      {importResult.insertedCount === 0 && importResult.totalRows > 0 && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm font-bold text-red-700">⚠️ 0 products were saved to the database.</p>
                          <p className="text-xs text-red-600 mt-1">
                            This usually means the database table doesn&apos;t exist yet or the server wasn&apos;t restarted after the .env.local fix.
                            Check the error details below and make sure you clicked <strong>Initialize Database</strong> first.
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-2 text-center py-2 bg-white rounded-lg border">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Total Rows</p>
                          <p className="text-lg font-bold text-gray-800">{importResult.totalRows}</p>
                        </div>
                        <div className="border-x">
                          <p className="text-xs text-gray-500 uppercase">Success</p>
                          <p className={`text-lg font-bold ${importResult.insertedCount > 0 ? "text-emerald-600" : "text-red-600"}`}>{importResult.insertedCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Errors</p>
                          <p className="text-lg font-bold text-red-600">{importResult.errorCount}</p>
                        </div>
                      </div>

                      {importResult.errors && importResult.errors.length > 0 && (
                        <div className="mt-4">
                          <p className="font-semibold text-red-700 mb-1">Errors Details:</p>
                          <ul className="text-xs font-mono bg-red-50 text-red-800 p-3 rounded-lg max-h-40 overflow-y-auto space-y-1">
                            {importResult.errors.map((err: string, i: number) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
