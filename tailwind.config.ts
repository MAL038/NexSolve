import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark:    "rgb(var(--brand-700-rgb) / <alpha-value>)",
          DEFAULT: "rgb(var(--brand-500-rgb) / <alpha-value>)",
          light:   "rgb(var(--brand-300-rgb) / <alpha-value>)",
          50:      "rgb(var(--brand-50-rgb)  / <alpha-value>)",
          100:     "rgb(var(--brand-100-rgb) / <alpha-value>)",
          200:     "rgb(var(--brand-200-rgb) / <alpha-value>)",
          300:     "rgb(var(--brand-300-rgb) / <alpha-value>)",
          400:     "rgb(var(--brand-400-rgb) / <alpha-value>)",
          500:     "rgb(var(--brand-500-rgb) / <alpha-value>)",
          600:     "rgb(var(--brand-600-rgb) / <alpha-value>)",
          700:     "rgb(var(--brand-700-rgb) / <alpha-value>)",
          800:     "rgb(var(--brand-800-rgb) / <alpha-value>)",
          900:     "rgb(var(--brand-900-rgb) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Poppins", "sans-serif"],
      },
      borderRadius: {
        xl:  "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
