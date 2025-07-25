"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.user && data.session) {
        // Redirect to Stripe Checkout
        const response = await fetch("/api/create-checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${data.session.access_token}`,
          },
        });

        const responseData = await response.json();
        console.log("Checkout response:", responseData);
        
        if (response.ok && responseData.url) {
          window.location.href = responseData.url;
        } else {
          console.error("Checkout error:", responseData);
          setError(responseData.error || "Failed to create checkout session");
        }
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
                  <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
            <p className="text-gray-700 mt-2 font-medium">Welcome back</p>
          </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-base font-medium text-gray-900">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-base font-medium text-gray-900">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="text-center">
          <p className="text-base text-gray-700 font-medium">
            Don't have an account?{" "}
            <Link href="/signup" className="font-medium text-black hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
} 