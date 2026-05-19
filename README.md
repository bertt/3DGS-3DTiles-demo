# Wilhelmina – Gaussian Splat Viewer

A Vite/Node.js viewer for Gaussian Splat 3D Tiles, built with **Three.js**, **3d-tiles-renderer** and the **3D-Tiles-RendererJS-3DGS-Plugin**. Satellite imagery is streamed via `XYZTilesPlugin` onto a WGS84 ellipsoid globe.

## Stack

| Package | Role |
|---|---|
| [three.js](https://threejs.org) | WebGL renderer, scene, camera |
| [3d-tiles-renderer](https://github.com/NASA-AMMOS/3DTilesRendererJS) | 3D Tiles loading & streaming |
| [XYZTilesPlugin](https://github.com/NASA-AMMOS/3DTilesRendererJS) | ArcGIS satellite imagery globe |
| [3d-tiles-rendererjs-3dgs-plugin](https://github.com/WilliamLiu-1997/3D-Tiles-RendererJS-3DGS-Plugin) | Gaussian Splat rendering via Spark |
| [@sparkjsdev/spark](https://github.com/sparkjsdev/spark) | SPZ splat renderer |
| [vite](https://vitejs.dev) | Dev server & static build |

## Requirements

- Node.js 18+
- The tileset must be present at `../wilhelmina/` relative to this folder (i.e. `wilhelmina/tileset.json` next to this project directory)

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

The Vite dev server automatically serves `../wilhelmina/` at `/tileset-data/`. Open [http://localhost:5173](http://localhost:5173). The camera flies to the splat content automatically once the tileset has loaded.

## Production build

```bash
npm run build
```

Static output is written to `dist/`.

### Making the tileset available on your server

The built site references `/tileset-data/tileset.json`. Place the contents of the `wilhelmina/` folder at `/tileset-data/` on your web server:

```
/                  ← deploy dist/ here
/tileset-data/     ← contents of wilhelmina/ here
  tileset.json
  tiles/
    ...
```

To test locally:

```bash
npm install -g serve
cd ..
serve -p 8080
# App:     http://localhost:8080/3d-tiles-renderer/dist/
# Tileset: http://localhost:8080/wilhelmina/tileset.json
```

Alternatively, change `TILESET_URL` in `src/main.js` to point to wherever your tileset is hosted.

## Controls

| Action | Input |
|---|---|
| Orbit | Left-drag |
| Pan | Right-drag / Ctrl + drag |
| Zoom | Scroll wheel |

## Architecture

The viewer follows the approach of the [3D-Tiles-RendererJS-3DGS-Plugin sample](https://github.com/WilliamLiu-1997/3D-Tiles-RendererJS-3DGS-Plugin/blob/main/examples/shared/viewer.js):

- A `WebGLRenderer` drives a full-page Three.js scene.
- `imageryTiles` uses `XYZTilesPlugin` to render an ArcGIS satellite globe in the opaque pass.
- `splatTiles` uses `GaussianSplatPlugin` to stream and render the SPZ-compressed Gaussian splats as transparent geometry via Spark.
- `CameraController` handles orbit / pan / zoom with inertia, raycasting against the scene and the WGS84 ellipsoid.
- On `load-tileset` the camera automatically frames the splat content.
