"use client";

import Link from "next/link";

export default function Cancel() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Cancelled</h1>
          <p className="text-gray-700 mt-2 font-medium">
            You cancelled the payment setup. You can try again anytime.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full px-4 py-2 text-base font-medium border border-black rounded hover:bg-black hover:text-white transition"
          >
            Back to Home
          </Link>
          
          <Link
            href="/login"
            className="block w-full px-4 py-2 text-base font-medium bg-black text-white rounded hover:bg-gray-800 transition"
          >
            Try Again
          </Link>
        </div>
      </div>
    </main>
  );
} 