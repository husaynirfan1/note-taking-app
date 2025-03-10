"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, provider } from "@/lib/firebaseConfig";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import Link from "next/link";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    // Check both localStorage and cookies for authentication
    const token = localStorage.getItem("accessToken");
    const hasCookie = document.cookie.split(';').some(item => item.trim().startsWith('accessToken='));
    
    if (token && hasCookie) {
      router.push("/dashboard");
    } else if (token && !hasCookie) {
      // If token exists in localStorage but not in cookies, set the cookie
      document.cookie = `accessToken=${token}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
      router.push("/dashboard");
    }
  }, [router]);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        // Store in localStorage for API calls
        localStorage.setItem("accessToken", token);
        
        // Set cookie for middleware authentication
        document.cookie = `accessToken=${token}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
        
        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        setError("Failed to retrieve access token");
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      setError(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl border border-gray-700 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to BrainyNotes</h1>
          <p className="text-gray-400">Sign in to unlock your intelligent note-taking experience</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-md mb-6">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition duration-300 ${
            loading ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {loading ? "Signing in..." : "Sign in with Google"}
        </button>

        <div className="mt-8 text-center text-gray-400">
          <Link href="/" className="text-blue-400 hover:text-blue-300 transition duration-300">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
