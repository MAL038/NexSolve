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
          dark:    "var(--brand-700)",
          DEFAULT: "var(--brand-500)",
          light:   "var(--brand-300)",
          50:      "var(--brand-50)",
          100:     "var(--brand-100)",
          200:     "var(--brand-200)",
          300:     "var(--brand-300)",
          400:     "var(--brand-400)",
          500:     "var(--brand-500)",
          600:     "var(--brand-600)",
          700:     "var(--brand-700)",
          800:     "var(--brand-800)",
          900:     "var(--brand-900)",
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
