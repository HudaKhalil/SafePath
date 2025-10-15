// tailwind.config.js (at project root)
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",     // covers src/app and src/components
    "./app/**/*.{js,ts,jsx,tsx,mdx}",     // (in case you didn't use /src)
  ],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1F6A3B",
          50: "#EEF7F1",
          100: "#DCEFE3",
          200: "#B7E0C6",
          300: "#8FD1A9",
          400: "#66C18B",
          500: "#3EB16E",
          600: "#1F6A3B",
          700: "#17502C",
          800: "#0F371E",
          900: "#081F11",
        },
        sp: {
          bg: "#ECF5EB",
          ink: "#293333",
          inkMuted: "#41504C",
          title: "#3F6244",
          safe: "#51A664",
          fast: "#F09D38",
          card: "#FFFFFF",
          cardAlt: "#F0F6EF",
          cardAlt2: "#FBFDFB",
        },
        accent: { DEFAULT: "#F59E0B" },
      },
      boxShadow: { soft: "0 8px 24px rgba(0,0,0,0.08)" },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};
