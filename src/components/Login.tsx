"use client";
import { auth, provider } from "@/lib/firebaseConfig";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Brain } from "lucide-react";

interface LoginProps {
  onToggleBrainView?: () => void;
}

export default function Login({ onToggleBrainView }: LoginProps = {}) {
  const [user, setUser] = useState<{ displayName: string | null; email: string | null; photoURL: string | null; uid: string } | null>(null);
  // Store access token for potential future use
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("User authenticated:", user);
        console.log("Photo URL:", user.photoURL);
        
        // Reset avatar states when user changes
        setAvatarLoaded(false);
        setAvatarError(false);
        setUser(user);
      } else {
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem("accessToken");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      // Force a fresh login to get updated profile info
      provider.setCustomParameters({
        prompt: 'select_account',
        access_type: 'online'
      });
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken; // ✅ Get OAuth token for Google Drive
      
      // Log user info for debugging
      console.log("Login successful, user info:", result.user);
      console.log("Photo URL from login:", result.user.photoURL);

      if (token) {
        // Store in localStorage for API calls
        localStorage.removeItem("accessToken");
        localStorage.setItem("accessToken", token);
        
        // Set cookie for middleware authentication
        document.cookie = `accessToken=${token}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
        
        setAccessToken(token); // Update state
        console.log("User authenticated successfully");
        
        // Redirect to dashboard if on login page
        if (window.location.pathname === "/login") {
          window.location.href = "/dashboard";
        }
      } else {
        console.error("Failed to retrieve OAuth access token.");
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      // Show loading state before logout
      setIsLoggingOut(true);
      
      // Clear localStorage and cookies first for immediate UI feedback
      localStorage.removeItem("accessToken");
      document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      
      // Then sign out from Firebase (this might take a moment)
      await signOut(auth);
      
      console.log("User logged out");
      
      // Use Next.js router for smoother transition
      setTimeout(() => {
        window.location.href = "/";
      }, 300); // Short delay for animation
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false); // Reset if there's an error
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50 font-[var(--font-open-sans)]">
      {user ? (
        <div className="flex items-center gap-4 bg-gray-800/90 backdrop-blur-sm p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-gray-600/50 transition-all duration-300 hover:shadow-[0_8px_35px_rgba(59,130,246,0.2)]">
          {/* Brain Icon Button */}
          <button 
            onClick={() => onToggleBrainView && onToggleBrainView()} 
            className="flex items-center justify-center p-2 bg-indigo-600 rounded-full hover:bg-indigo-500 transition-all"
            title="Brain Visualization"
          >
            <Brain size={20} className="text-white" />
          </button>
          {/* User Avatar */}
          <div className="relative w-10 h-10 rounded-full border-2 border-blue-500 overflow-hidden">
            {!avatarLoaded && !avatarError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              </div>
            )}
            {user?.photoURL && !avatarError ? (
              <Image
                src={`${user.photoURL}?height=96&width=96`} // Force size parameters for Google photos
                alt="User Avatar"
                referrerPolicy="no-referrer" // Important for Google photos
                crossOrigin="anonymous"
                className={`w-full h-full object-cover transition-opacity duration-300 ${avatarLoaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ opacity: isLoggingOut ? 0.5 : 1 }}
                width={96}
                height={96}
                onLoad={() => {
                  console.log("Avatar loaded successfully");
                  setAvatarLoaded(true);
                }}
                onError={(e) => {
                  console.error("Failed to load user avatar:", e);
                  setAvatarError(true);
                }}
              />
            ) : (
              <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="text-right transition-opacity duration-300" style={{ opacity: isLoggingOut ? 0.5 : 1 }}>
            <p className="text-sm font-semibold">{user.displayName}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`px-4 py-2 rounded-lg transition duration-300 flex items-center justify-center min-w-[90px] ${isLoggingOut ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
          >
            {isLoggingOut ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing out...
              </>
            ) : 'Sign Out'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleLogin}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-[0_4px_20px_rgba(59,130,246,0.5)] hover:bg-blue-700 hover:shadow-[0_4px_25px_rgba(59,130,246,0.6)] transition duration-300 font-medium"
        >
          Sign in with Google
        </button>
      )}
    </div>
  );
}