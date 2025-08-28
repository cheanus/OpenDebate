import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import vuetify from 'vite-plugin-vuetify';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), vuetify({ autoImport: true })],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 将 Vue 和相关库分离为单独的 chunk
          'vue-vendor': ['vue', 'vue-router'],
          // 将 Vuetify 分离为单独的 chunk（移除 @mdi/font）
          'vuetify-vendor': ['vuetify'],
          // 将 Cytoscape 相关库分离（如果存在的话）
          'graph-vendor': ['cytoscape'],
          // 将大型 composables 分离
          'composables': [
            './src/composables/core/useOpinionGraph/useOpinionGraph.ts',
            './src/composables/core/useOpinionGraph/useGraphOperations.ts',
            './src/composables/core/useOpinionGraph/useGraphCRUD.ts'
          ]
        }
      }
    },
    // 调整 chunk 大小警告阈值
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 3141,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_HOST || 'http://localhost:3142/api/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
