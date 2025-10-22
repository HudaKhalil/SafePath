/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        primary: "#1e293b",
        "primary-dark": "#0f172a",
        accent: "#06d6a0",
        "accent-light": "#4ade80",
        "text-primary": "#f8fafc",
        "text-secondary": "#94a3b8",
        hazard: "#f59e0b", // base orange
        "hazard-light": "#fbbf24", // a bit lighter (amber 400)
        "hazard-soft": "#fde68a", // much lighter (amber 200)
        "hazard-softest": "#fffbeb", // ultra light (amber 50)
      },
      boxShadow: { soft: "0 8px 24px rgba(0,0,0,0.08)" },
      borderRadius: { xl2: "1.25rem" },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { fadeIn: "fadeIn 400ms ease-in" },
    },
  },
  plugins: [],
};
