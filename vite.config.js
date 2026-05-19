import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve ../wilhelmina/ directory at /tileset-data/ during development
const serveTilesetPlugin = {
  name: 'serve-tileset-data',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!req.url.startsWith('/tileset-data/')) return next();
      const rel = req.url.slice('/tileset-data/'.length);
      const filePath = path.join(__dirname, '..', 'wilhelmina', rel);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return next();
      const ext = path.extname(filePath).toLowerCase();
      const mime = {
        '.json': 'application/json',
        '.glb': 'model/gltf-binary',
        '.gltf': 'application/json',
      };
      res.setHeader('Content-Type', mime[ext] ?? 'application/octet-stream');
      res.setHeader('Access-Control-Allow-Origin', '*');
      fs.createReadStream(filePath).pipe(res);
    });
  },
};

// Copy index_cesium.html to dist/ after each production build (if it exists).
// Also copy ../wilhelmina/ → dist/tileset-data/ so the static site is self-contained.
const copyCesiumPlugin = {
  name: 'copy-cesium-html',
  closeBundle() {
    // index_cesium.html
    const src = path.join(__dirname, 'index_cesium.html');
    const dest = path.join(__dirname, 'dist', 'index_cesium.html');
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log('Copied index_cesium.html → dist/index_cesium.html');
    }

    // tileset-data (../wilhelmina → dist/tileset-data)
    const tilesetSrc = path.join(__dirname, '..', 'wilhelmina');
    const tilesetDest = path.join(__dirname, 'dist', 'tileset-data');
    if (fs.existsSync(tilesetSrc)) {
      copyDirSync(tilesetSrc, tilesetDest);
      console.log('Copied ../wilhelmina → dist/tileset-data');
    }
  },
};

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [serveTilesetPlugin, copyCesiumPlugin],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
