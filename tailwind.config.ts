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
        primary: '#4A90E2',
        success: '#7ED321',
        accent: '#F5A623',
        error: '#E74C3C',
      },
    },
  },
  plugins: [],
};

export default config;
