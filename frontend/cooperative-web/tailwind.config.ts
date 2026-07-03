import type { Config } from "tailwindcss";

/**
 * Tailwind config is required for shadcn/ui to work properly,
 * even when using the Vite plugin.
 */
const config: Config = {
  darkMode: ["class", ".dark"],

  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],

  theme: {
    extend: {},
  },

  plugins: [],
};

export default config;