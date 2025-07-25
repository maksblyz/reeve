"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Success() {
  const [countdown, setCountdown] = useState(5);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push("/signal");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Method Added!</h1>
          <p className="text-gray-700 mt-2 font-medium">
            Your payment method has been successfully added to your account.
          </p>
        </div>

        <div className="text-base text-gray-600 font-medium">
          Redirecting to your dashboard in {countdown} seconds...
        </div>

        <Link
          href="/signal"
          className="inline-block px-4 py-2 text-base font-medium border border-black rounded hover:bg-black hover:text-white transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  );
} 