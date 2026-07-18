import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Builds a single self-contained HTML (no network) for the hosted preview / Artifact.
// Everything runs against the in-browser mock (src/demo/mock.ts).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  define: {
    'import.meta.env.VITE_DEMO': JSON.stringify('true'),
  },
  build: {
    outDir: 'dist-demo',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
})
