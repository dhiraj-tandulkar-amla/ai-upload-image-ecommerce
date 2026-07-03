import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white shadow">
      <div className=" flex  items-center justify-between px-6 py-4">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          ShopLens AI
        </Link>
        {/* <div className="search-box border rounded-3xl px-4 py-2 flex items-center gap-2 w-100">
          <input
            type="text"
            placeholder="🔍 Search products..."
            className="flex-1 outline-none"
          />
        </div> */}
        <nav className="flex gap-6 font-medium">
          {/* <Link href="/">Home</Link> */}
          <Link href="/products">Products</Link>
          <Link href="/compare">Compare</Link>
        </nav>
      </div>
    </header>
  );
}
