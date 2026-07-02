import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ComparePage() {
    return (
        <>
            <Header />

            <main className="mx-auto max-w-7xl px-6 py-10 flex-1">
                <h1 className="text-3xl font-bold">Product Comparison</h1>

                <p className="mt-4 text-gray-600">
                    Here you can show selected product comparison like price, brand,
                    rating, color, and category.
                </p>

                <div className="mt-8 rounded-xl border p-6 text-center text-gray-500">
                    Comparison data will be displayed here.
                </div>
            </main>

            <Footer />
        </>
    );
}