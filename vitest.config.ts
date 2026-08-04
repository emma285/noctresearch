import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    // Next.js 스타일 절대경로 alias
    alias: {
      '@/': new URL('./', import.meta.url).pathname,
    },
  },
})
