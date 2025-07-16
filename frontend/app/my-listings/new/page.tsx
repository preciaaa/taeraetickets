import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function NewListingSelectionPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/90 shadow-2xl border border-yellow-200 rounded-2xl p-10 max-w-md w-full flex flex-col items-center animate-scale-in">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 bg-taeraeyellow rounded-xl shadow">
            <Sparkles className="w-6 h-6 text-black" />
          </span>
          <h1 className="text-3xl font-bold text-gray-800">Create a New Listing</h1>
        </div>
        <p className="mb-8 text-gray-500 text-center">Choose how you want to list your tickets:</p>
        <div className="flex flex-col gap-4 w-full">
          <Link
            href="/my-listings/new/individual"
            className="w-full px-6 py-4 rounded-lg bg-yellow-100 text-yellow-900 text-lg font-semibold text-center shadow hover:bg-yellow-200 transition-colors duration-200 border border-yellow-300"
          >
            Create Individual Listing
          </Link>
          <Link
            href="/my-listings/new/bundle"
            className="w-full px-6 py-4 rounded-lg bg-blue-50 text-blue-900 text-lg font-semibold text-center shadow hover:bg-blue-100 transition-colors duration-200 border border-blue-200"
          >
            Create Bundle Listing
          </Link>
        </div>
      </div>
    </div>
  );
} 