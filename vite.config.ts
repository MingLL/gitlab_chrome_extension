import react from '@vitejs/plugin-react';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(rootDir, 'dist');
const serviceWorkerEntry = 'src/background/service-worker.ts';
const sidePanelInput = 'src/sidepanel/index.html';
const sidePanelBuiltPath = resolve(distDir, 'src/sidepanel/index.html');
const sidePanelInstallPath = resolve(distDir, 'sidepanel/index.html');
const serviceWorkerOutput = 'background/service-worker.js';

const extensionOutputLayout = () => ({
  name: 'extension-output-layout',
  async closeBundle() {
    await mkdir(dirname(sidePanelInstallPath), { recursive: true });
    await copyFile(sidePanelBuiltPath, sidePanelInstallPath);
    await rm(resolve(distDir, 'src'), { recursive: true, force: true });
  }
});

export default defineConfig({
  plugins: [react(), extensionOutputLayout()],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: sidePanelInput,
        'background/service-worker': serviceWorkerEntry
      },
      output: {
        entryFileNames(chunk) {
          if (chunk.name === 'background/service-worker') {
            return serviceWorkerOutput;
          }

          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames(assetInfo) {
          if (assetInfo.name?.startsWith('icon-')) {
            return 'icons/[name][extname]';
          }

          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts']
  }
});
