"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignupRedirect() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleSignupRedirect = async () => {
      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError("No session found. Please try signing up again.");
          setLoading(false);
          return;
        }

        console.log("Signup redirect - session found, creating setup session...");
        
        // Create setup session for card collection
        const response = await fetch("/api/create-setup-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
        });

        const responseData = await response.json();
        console.log("Setup response:", responseData);
        
        if (response.ok && responseData.url) {
          window.location.href = responseData.url;
        } else {
          console.error("Setup error:", responseData);
          setError(responseData.error || "Failed to create setup session");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error in signup redirect:", error);
        setError("An unexpected error occurred");
        setLoading(false);
      }
    };

    handleSignupRedirect();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-4">Setting up your account...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-sm mb-4">{error}</div>
          <button
            onClick={() => window.location.href = '/signup'}
            className="px-4 py-2 text-sm font-medium text-black border border-black rounded-md hover:bg-black hover:text-white transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return null;
} 