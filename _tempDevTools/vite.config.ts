import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import checker from 'vite-plugin-checker';

// import { visualizer } from 'rollup-plugin-visualizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const copyRequiredFiles = () => {
  return {
    name: 'copy-manifest',
    closeBundle() {
      fs.mkdirSync(path.resolve(__dirname, 'dist/assets'), { recursive: true });

      [
        'manifest.json',
        'devtools_page.html',
        'assets/devtools_page_icon.ico',
        'assets/devtools_page_icon-28px.ico',
      ].forEach((file) => {
        const filePath = path.resolve(__dirname, `src/${file}`);

        fs.copyFileSync(filePath, path.resolve(__dirname, `dist/${file}`));
      });
    },
  };
};

export default defineConfig(({ mode }) => {
  const isProduction = mode !== 'development';
  if (!isProduction) {
    console.log('Development mode');
  }

  // The production extension only ships index.html + main_tab.html. The local
  // preview page (index.local.html -> src/index.dev.tsx) seeds mock data and is
  // only built in development so mock fixtures never leak into the prod bundle.
  const rollupInput: Record<string, string> = {
    index: path.resolve(__dirname, 'index.html'),
    main_tab: path.resolve(__dirname, 'main_tab.html'),
  };

  if (!isProduction) {
    rollupInput['index.local'] = path.resolve(__dirname, 'index.local.html');
  }

  return {
    plugins: [
      react(),
      copyRequiredFiles(),
      checker({
        typescript: true,
        overlay: {
          initialIsOpen: true,
        },
      }),
    ],
    define: {},
    build: {
      sourcemap: !isProduction,
      minify: isProduction ? 'terser' : false,
      emptyOutDir: false,
      rollupOptions: {
        input: rollupInput,
      },
      // disable minification in development
      terserOptions: {
        sourceMap: !isProduction,
      },
    },
    resolve: {
      alias: {
        '@src': path.resolve(__dirname, './src'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@pages/shared': path.resolve(__dirname, './src/pages/shared'),
        '@main_tab': path.resolve(__dirname, './src/pages/main_tab'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
  };
});
