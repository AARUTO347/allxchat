import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
      ignored: [
        '**/animdustry-play/**',
        '**/AARUTO_ANIME.AI/**',
        '**/AARUESP*/**',
        '**/AUTAI_ZEN_AOD_2.0/**',
        '**/animdustry/**',
        '**/whatsapp-bridge/**',
        '**/vercel-stage/**',
        '**/assets/**',
        '**/.firebase/**',
        '**/.netlify/**',
      ],
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
          emoji: ['emoji-picker-react'],
        },
      },
    },
  },
});
