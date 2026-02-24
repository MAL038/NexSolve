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
          dark:    "#0A6645",
          DEFAULT: "#0A6645",
          light:   "#69B296",
          50:      "#f0f9f5",
          100:     "#d6f0e4",
          200:     "#aedeca",
          300:     "#69B296",
          400:     "#3d9473",
          500:     "#0A6645",
          600:     "#085a3c",
          700:     "#064d33",
          800:     "#04402a",
          900:     "#023320",
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
