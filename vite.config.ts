import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa: funciona igual en GitHub Pages (/APPSQL/) y en Vercel (/).
export default defineConfig({
  base: './',
  plugins: [react()],
})
