"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved theme from localStorage or default to light
    const saved = localStorage.getItem("theme") || "light";
    setTheme(saved);
    
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    console.log("Theme loaded:", saved, "HTML has dark class:", document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    console.log("Toggling from", theme, "to", newTheme);
    
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    const html = document.documentElement;
    
    // Properly add or remove the dark class
    if (newTheme === "dark") {
      html.classList.add("dark");
      console.log("✓ Added dark class to HTML");
    } else {
      html.classList.remove("dark");
      console.log("✓ Removed dark class from HTML");
    }
    
    console.log("HTML classes:", html.className);
    console.log("Has dark class:", html.classList.contains("dark"));
    console.log("CSS var --color-text-primary:", getComputedStyle(html).getPropertyValue('--color-text-primary'));
    console.log("Body background:", getComputedStyle(document.body).background);
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
      className="p-2 rounded-lg transition-all duration-200 hover:scale-110 focus:outline-none"
      style={{
        backgroundColor: theme === 'dark' ? 'rgba(6, 214, 160, 0.15)' : 'rgba(241, 245, 249, 0.8)',
        color: theme === 'dark' ? '#06d6a0' : '#0f172a'
      }}
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        // Show sun icon in dark mode (to switch to light)
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      ) : (
        // Show moon icon in light mode (to switch to dark)
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}