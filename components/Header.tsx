import Link from "next/link";

export default function Header() {
    return (
        <header className="sticky top-0 z-50 bg-white shadow">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <Link href="/" className="text-2xl font-bold text-blue-600">
                    AI Shop
                </Link>

                <nav className="flex gap-6 font-medium">
                    <Link href="/">Home</Link>
                    <Link href="/products">Products</Link>
                    <Link href="/compare">Compare</Link>
                </nav>
            </div>
        </header>
    );
}