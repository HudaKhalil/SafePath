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
        primary: "var(--color-primary)",
        "primary-dark": "var(--color-primary-dark)",
        accent: "var(--color-accent)",
        "accent-light": "var(--color-accent-light)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        hazard: "var(--color-hazard)",
        "hazard-light": "var(--color-hazard-light)",
        "hazard-soft": "var(--color-hazard-soft)",
        "hazard-softest": "var(--color-hazard-softest)",
        danger: "var(--color-danger)",
        "danger-light": "var(--color-danger-light)",
        success: "var(--color-success)",
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
