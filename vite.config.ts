import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // @ts-ignore - Type mismatch due to Vite v6 downgrade
    react(),
    // @ts-ignore
    tailwindcss()
  ],
})
