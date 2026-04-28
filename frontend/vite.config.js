import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({mode}) => ({
  // base is set to repo name for GitHub Pages; locally it's '/'
  base: process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/',
  plugins: [
    tailwindcss(),
    react(),
  ],
  optimizeDeps: {
    include: ['react-pdf'],
  },
  build: {
    commonjsOptions: {
      include: [/react-pdf/, /node_modules/],
    },
  },
  server: {
    port: 5173,
  },
}))
