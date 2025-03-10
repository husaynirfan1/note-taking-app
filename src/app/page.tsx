"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

// Define types for our animations
type PulsingDot = {
  id: number;
  x: string;
  y: string;
  duration: number;
  delay: number;
  size: string;
};

type Orb = {
  id: number;
  isResponsive: boolean;
  initialX: string;
  initialY: string;
  initialScale: number;
  animateX1: string;
  animateX2: string;
  animateY1: string;
  animateY2: string;
  animateScale1: number;
  animateScale2: number;
  durationX: number;
  durationY: number;
  durationScale: number;
  width: string;
  height: string;
  baseX: number;
  baseY: number;
};

type Particle = {
  id: number;
  x: string;
  y1: string;
  y2: string;
  scale: number;
  duration: number;
  width: string;
  height: string;
};

type Symbol = {
  id: number;
  symbol: string;
  x: string;
  y1: string;
  y2: string;
  rotate1: number;
  rotate2: number;
  duration: number;
};

// Pulsing dots animation component
function PulsingDots({ width = "100%", height = "100%", dotCount = 15, className = "" }) {
  const [dots, setDots] = useState<PulsingDot[]>([]);

  // Generate dots on client-side only to avoid hydration errors
  useEffect(() => {
    const newDots = Array.from({ length: Math.min(dotCount, 8) }).map((_, i) => ({
      id: i,
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      duration: Math.random() * 1.5 + 1, // Faster animation
      delay: Math.random() * 2, // Shorter delay
      size: `${Math.random() * 8 + 3}px`, // Slightly smaller dots
    }));
    setDots(newDots);
  }, [dotCount]);

  return (
    <div 
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {dots.map((dot) => (
        <motion.div
          key={`pulse-dot-${dot.id}`}
          className="absolute rounded-full bg-blue-500"
          initial={{
            x: dot.x,
            y: dot.y,
            scale: 0,
            opacity: 0
          }}
          animate={{
            scale: [0, 1.5, 0],
            opacity: [0, 0.2, 0]
          }}
          transition={{
            repeat: Infinity,
            duration: dot.duration,
            delay: dot.delay,
            ease: "easeInOut"
          }}
          style={{
            width: dot.size,
            height: dot.size
          }}
        />
      ))}
    </div>
  );
}

// Animated background component
function AnimatedBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  
  // Handle mouse movement for responsive orbs
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  // Generate orbs on client-side only - optimized for performance
  useEffect(() => {
    // Reduce number of orbs for better performance
    const newOrbs = Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      isResponsive: i < 2,
      initialX: Math.random() * 100 - 50 + '%',
      initialY: Math.random() * 100 - 50 + '%',
      initialScale: Math.random() * 0.5 + 0.5,
      animateX1: Math.random() * 100 - 50 + '%',
      animateX2: Math.random() * 100 - 50 + '%',
      animateY1: Math.random() * 100 - 50 + '%',
      animateY2: Math.random() * 100 - 50 + '%',
      animateScale1: Math.random() * 0.5 + 0.5,
      animateScale2: Math.random() * 0.8 + 0.8,
      // Faster animations
      durationX: Math.random() * 10 + 10,
      durationY: Math.random() * 10 + 10,
      durationScale: Math.random() * 5 + 5,
      width: (Math.random() * 20 + 10) + 'vw', // Slightly smaller
      height: (Math.random() * 20 + 10) + 'vw',
      baseX: Math.random() * 80 - 40,
      baseY: Math.random() * 80 - 40,
    }));
    setOrbs(newOrbs);
    
    // Reduce number of particles
    const newParticles = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100 + '%',
      y1: Math.random() * 100 + '%',
      y2: Math.random() * 100 + '%',
      scale: Math.random() * 0.2 + 0.1,
      duration: Math.random() * 5 + 3, // Faster animation
      width: (Math.random() * 4 + 2) + 'px',
      height: (Math.random() * 4 + 2) + 'px',
    }));
    setParticles(newParticles);
    
    // Reduce number of symbols and make them faster
    const symbolChars = ['✓', '⚡', '♦']; // Fewer symbols
    const newSymbols = symbolChars.map((symbol, i) => ({
      id: i,
      symbol,
      x: Math.random() * 100 + '%',
      y1: Math.random() * 80 + 10 + '%',
      y2: Math.random() * 80 + 10 + '%',
      rotate1: Math.random() * 180,
      rotate2: Math.random() * 180 + 180,
      duration: Math.random() * 10 + 8, // Faster rotation
    }));
    setSymbols(newSymbols);
  }, []);
  
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Animated gradient overlay */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-gray-900/90 to-gray-800/90 z-10"
        animate={{
          background: [
            `linear-gradient(to bottom, rgba(17, 24, 39, 0.9), rgba(31, 41, 55, 0.9))`,
            `linear-gradient(to bottom, rgba(17, 24, 39, 0.9), rgba(31, 41, 55, 0.9))`
          ]
        }}
        transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse' }} // Faster transition
      />
      
      {/* Animated orbs */}
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full bg-gradient-to-br from-blue-400 to-purple-600 opacity-20 blur-xl"
          initial={{
            x: orb.initialX,
            y: orb.initialY,
            scale: orb.initialScale,
          }}
          animate={{
            x: orb.isResponsive ? 
              `calc(${orb.baseX}% + ${(mousePosition.x - 0.5) * -30}px)` : 
              [orb.animateX1, orb.animateX2],
            y: orb.isResponsive ? 
              `calc(${orb.baseY}% + ${(mousePosition.y - 0.5) * -30}px)` : 
              [orb.animateY1, orb.animateY2],
            scale: [orb.animateScale1, orb.animateScale2],
          }}
          transition={{
            x: { repeat: Infinity, repeatType: 'reverse', duration: orb.durationX, ease: 'easeInOut' },
            y: { repeat: Infinity, repeatType: 'reverse', duration: orb.durationY, ease: 'easeInOut' },
            scale: { repeat: Infinity, repeatType: 'reverse', duration: orb.durationScale, ease: 'easeInOut' },
          }}
          style={{
            width: orb.width,
            height: orb.height,
          }}
        />
      ))}
      
      {/* Small particles */}
      {particles.map((particle) => (
        <motion.div
          key={`particle-${particle.id}`}
          className="absolute rounded-full bg-blue-500 opacity-30"
          initial={{
            x: particle.x,
            y: particle.y1,
            scale: particle.scale,
          }}
          animate={{
            y: [particle.y1, particle.y2],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            repeat: Infinity,
            repeatType: 'reverse',
            duration: particle.duration,
            ease: 'easeInOut',
          }}
          style={{
            width: particle.width,
            height: particle.height,
          }}
        />
      ))}
      
      {/* Floating symbols */}
      {symbols.map((item) => (
        <motion.div
          key={`symbol-${item.id}`}
          className="absolute text-blue-400/20 font-bold text-4xl md:text-6xl"
          initial={{
            x: item.x,
            y: item.y1,
            rotate: item.rotate1,
            opacity: 0.1,
          }}
          animate={{
            y: [item.y1, item.y2],
            rotate: [item.rotate1, item.rotate2],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            repeat: Infinity,
            repeatType: 'reverse',
            duration: item.duration,
            ease: 'easeInOut',
          }}
        >
          {item.symbol}
        </motion.div>
      ))}
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDIwMjAiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMC0zMHY2aDZ2LTZoLTZ6TTYgNHY2aDZ2LTZINnptMCAzMHY2aDZ2LTZINnptMCAxNXY2aDZ2LTZINnptMTUgMHY2aDZ2LTZoLTZ6bTE1IDB2Nmg2di02aC02em0xNSAwdjZoNnYtNmgtNnptMC0xNXY2aDZ2LTZoLTZ6bTAtMTV2Nmg2di02aC02em0tMzAgMHY2aDZ2LTZoLTZ6bTE1LTE1djZoNnYtNmgtNnptLTE1IDB2Nmg2di02aC02em0zMCAzMHY2aDZ2LTZoLTZ6bS0xNSAwdjZoNnYtNmgtNnptLTE1IDB2Nmg2di02aC02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-10 z-20" />
      
      {/* Light beam effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-screen bg-gradient-to-b from-blue-500/10 via-purple-500/5 to-transparent opacity-30 blur-3xl" />
    </div>
  );
}

// Animation component for the note-taking concept
function NoteTakingAnimation() {
  const [activeNote, setActiveNote] = useState(0);
  const [typing, setTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const notes = [
    { title: "Project Ideas", content: "AI-powered note organization" },
    { title: "Meeting Notes", content: "Discuss new feature implementation" },
    { title: "Research", content: "Cloud storage integration options" },
    { title: "To-Do List", content: "Complete landing page design" },
    { title: "Inspiration", content: "Modern UI patterns for note apps" },
  ];

  useEffect(() => {
    // Cycle through notes with typing animation - faster
    timeoutRef.current = setTimeout(() => {
      setTyping(true);
      
      setTimeout(() => {
        setTyping(false);
        setTimeout(() => {
          setActiveNote((prev) => (prev + 1) % notes.length);
        }, 300); // Faster transition
      }, 1000); // Faster typing
    }, 1200); // Faster delay between notes

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeNote]);

  return (
    <div className="flex-1 grid grid-cols-3 gap-4">
      {notes.map((note, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            y: i === activeNote ? -5 : 0,
            boxShadow: i === activeNote ? "0 10px 25px -5px rgba(59, 130, 246, 0.3)" : "none"
          }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className={`bg-gray-700/50 rounded-lg p-3 flex flex-col ${i === activeNote ? 'ring-2 ring-blue-500' : ''}`}
        >
          <motion.div 
            className="w-full h-4 bg-gray-600/80 rounded mb-2 overflow-hidden"
            style={{ position: 'relative' }}
          >
            {i === activeNote && (
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: typing ? '100%' : '70%' }}
                transition={{ duration: 1.5 }}
                className="absolute top-0 left-0 h-full bg-blue-500/50 rounded"
              />
            )}
          </motion.div>
          <motion.div className="w-2/3 h-3 bg-gray-600/80 rounded mb-2" />
          <motion.div className="w-1/2 h-3 bg-gray-600/80 rounded" />
        </motion.div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("accessToken");
    setIsAuthenticated(!!token);
  }, []);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen text-white relative">
      <AnimatedBackground />
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <svg
            className="w-8 h-8 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <span className="text-xl font-bold">BrainyNotes</span>
        </div>

        <div className="space-x-4">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition duration-300"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition duration-300"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16 flex flex-col md:flex-row items-center justify-between relative z-10">
        <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
        className="md:w-1/2 mb-16 md:mb-0">
          <div className="relative">
            <PulsingDots height="100%" dotCount={12} className="z-0" />
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 relative z-10">
              Elevate Your Ideas with BrainyNotes
            </h1>
            <p className="text-xl text-gray-300 mb-8 relative z-10">
              The intelligent note-taking platform that transforms how you capture, organize, and develop your thoughts. Seamlessly integrated with Google Drive for ultimate accessibility and peace of mind.
            </p>
          </div>
          <motion.button
            onClick={handleGetStarted}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-lg font-semibold transition duration-300 shadow-lg shadow-blue-500/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isAuthenticated ? "Go to Dashboard" : "Get Started"}
          </motion.button>
        </motion.div>
        <div className="md:w-1/2 flex justify-center relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative w-full max-w-lg h-96 bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden border border-gray-700/50"
            whileHover={{ boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.25)" }}
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20"
              animate={{
                background: [
                  "linear-gradient(to bottom right, rgba(59, 130, 246, 0.2), rgba(124, 58, 237, 0.2))",
                  "linear-gradient(to bottom right, rgba(59, 130, 246, 0.1), rgba(236, 72, 153, 0.2))",
                  "linear-gradient(to bottom right, rgba(59, 130, 246, 0.2), rgba(124, 58, 237, 0.2))"
                ]
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }} // Faster transition
            />
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <NoteTakingAnimation />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="relative z-10 backdrop-blur-sm bg-gray-800/30 py-16">
        <div className="container mx-auto px-6">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12 relative inline-block"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="relative z-10">Smart Features</span>
            <motion.span 
              className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              transition={{ duration: 0.5, delay: 0.2 }} // Faster animation
            />
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }} // Faster animation
              viewport={{ once: true }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg"
            >
              <div className="text-blue-500 mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="relative">
                <PulsingDots height="100%" dotCount={8} className="z-0" />
                <h3 className="text-xl font-semibold mb-2 relative z-10">Cloud-Powered Security</h3>
                <p className="text-gray-400 relative z-10">Your brilliant ideas are protected with Google Drive integration, giving you enterprise-grade security with zero setup.</p>
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }} // Faster animation
              viewport={{ once: true }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg"
            >
              <div className="text-blue-500 mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="relative">
                <PulsingDots height="100%" dotCount={8} className="z-0" />
                <h3 className="text-xl font-semibold mb-2 relative z-10">Intuitive Organization</h3>
                <p className="text-gray-400 relative z-10">Structure your thoughts with our folder system designed for the way your brain works. Find what you need instantly.</p>
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }} // Faster animation
              viewport={{ once: true }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg"
            >
              <div className="text-blue-500 mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="relative">
                <PulsingDots height="100%" dotCount={8} className="z-0" />
                <h3 className="text-xl font-semibold mb-2 relative z-10">Seamless Accessibility</h3>
                <p className="text-gray-400 relative z-10">Your ideas follow you everywhere—access your notes from any device, anytime, with perfect synchronization.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="relative z-10 backdrop-blur-sm bg-gray-900/80 py-8">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-500">&copy; 2025 BrainyNotes. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
