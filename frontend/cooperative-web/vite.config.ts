import { defineConfig } from 'vite';
import tailwindcss from "@tailwindcss/vite";
import react from '@vitejs/plugin-react';
import path from "node:path";


// https://vite.dev/config/
// - Uses the official React plugin
// - Uses the official Tailwind Vite plugin
// - Adds the @ alias for cleaner imports
export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  resolve: {
  alias: [
    {
    find: "@/",
          replacement: `${path.resolve(__dirname, './src')}/`,
    },
  ] 
  
  },
})
