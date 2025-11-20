"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved theme from localStorage or default to dark
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  if (!mounted) {
    return (
      <button className="px-4 py-2 rounded-lg bg-accent text-primary-dark shadow">
        Theme
      </button>
    );
  }

  return (
<button
  onClick={toggleTheme}
  className="relative w-16 h-8 rounded-full transition-all duration-300 hover:scale-105"
  style={{
    backgroundColor: theme === 'dark' ? '#1e1b4b' : '#f59e0b'
  }}
  aria-label="Toggle theme"
>
  <span
    className="absolute top-0.5 w-7 h-7 rounded-full bg-white transition-all duration-300 flex items-center justify-center text-base"
    style={{
      transform: theme === 'dark' ? 'translateX(32px)' : 'translateX(2px)'
    }}
  >
    {theme === 'dark' ? '🪐' : '🌞'}
  </span>
</button>
  );
}