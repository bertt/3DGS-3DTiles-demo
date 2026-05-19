import {
  Color,
  Matrix4,
  PerspectiveCamera,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from 'three';
import { TilesRenderer } from '3d-tiles-renderer';
import {
  TileCompressionPlugin,
  TilesFadePlugin,
  UnloadTilesPlugin,
  XYZTilesPlugin,
} from '3d-tiles-renderer/plugins';
import { GaussianSplatPlugin } from '3d-tiles-rendererjs-3dgs-plugin';
import { CameraController } from './cameraController.js';

// During development this is served by the Vite middleware in vite.config.js.
// For a production static deploy, put the wilhelmina/ folder next to dist/
// and configure your server to serve it at /tileset-data/.
const TILESET_URL = '/tileset-data/tileset.json';

const SATELLITE_IMAGERY = {
  url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  levels: 18,
};

// ─── Renderer / scene / camera ────────────────────────────────────────────────

const renderer = new WebGLRenderer({ antialias: false });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new Scene();
scene.background = new Color(0x111111);

const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2e7);
camera.position.set(0, 0, 1.75e7);

// ─── Satellite imagery globe ──────────────────────────────────────────────────

const imageryTiles = new TilesRenderer();
imageryTiles.registerPlugin(new XYZTilesPlugin({
  shape: 'ellipsoid',
  center: true,
  levels: SATELLITE_IMAGERY.levels,
  url: SATELLITE_IMAGERY.url,
}));
imageryTiles.registerPlugin(new TilesFadePlugin());
imageryTiles.registerPlugin(new TileCompressionPlugin());
imageryTiles.registerPlugin(new UnloadTilesPlugin());
imageryTiles.setCamera(camera);
imageryTiles.setResolutionFromRenderer(camera, renderer);

// Keep globe in the opaque render path so depth sorting with transparent
// splats works correctly (see plugin README – Rendering Note).
imageryTiles.addEventListener('load-model', ({ scene: modelScene }) => {
  modelScene.traverse(child => {
    if (!child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach(m => { m.transparent = false; });
  });
});

scene.add(imageryTiles.group);

// ─── Camera controller ────────────────────────────────────────────────────────

const controls = new CameraController(renderer, scene, camera);
controls.setEllipsoid(imageryTiles.ellipsoid);

// ─── Gaussian Splat tileset ───────────────────────────────────────────────────

const sphere = new Sphere();
const cameraRotation = new Matrix4();
const cameraBack = new Vector3();
const cameraForward = new Vector3();
const cameraRight = new Vector3();
const cameraUp = new Vector3();

function frameTileset(tiles) {
  if (!tiles.getBoundingSphere(sphere)) return;
  const localUp = sphere.center.lengthSq() > 0
    ? sphere.center.clone().normalize()
    : new Vector3(0, 1, 0);
  const localSide = new Vector3().crossVectors(new Vector3(0, 0, 1), localUp);
  if (localSide.lengthSq() < 1e-6) localSide.crossVectors(new Vector3(1, 0, 0), localUp);
  localSide.normalize();
  const viewOffset = new Vector3().copy(localSide).addScaledVector(localUp, 0.5).normalize();
  camera.position.copy(sphere.center).addScaledVector(viewOffset, sphere.radius * 3);
  camera.up.set(0, 1, 0);
  cameraForward.subVectors(sphere.center, camera.position).normalize();
  cameraUp.copy(localUp).projectOnPlane(cameraForward).normalize();
  cameraBack.copy(cameraForward).negate();
  cameraRight.crossVectors(cameraUp, cameraBack).normalize();
  cameraUp.crossVectors(cameraBack, cameraRight).normalize();
  cameraRotation.makeBasis(cameraRight, cameraUp, cameraBack);
  camera.quaternion.setFromRotationMatrix(cameraRotation);
  camera.updateMatrixWorld();
}

const splatTiles = new TilesRenderer(TILESET_URL);
splatTiles.registerPlugin(new TilesFadePlugin());
splatTiles.registerPlugin(new TileCompressionPlugin());
splatTiles.registerPlugin(new UnloadTilesPlugin());
splatTiles.registerPlugin(new GaussianSplatPlugin({ renderer, scene }));
splatTiles.setCamera(camera);
splatTiles.setResolutionFromRenderer(camera, renderer);

const lru = splatTiles.lruCache;
lru.minSize = 256;
lru.maxSize = 4096;
lru.minBytesSize = 0.2 * 2 ** 30;
lru.maxBytesSize = 2.0 * 2 ** 30;

scene.add(splatTiles.group);

let framed = false;
splatTiles.addEventListener('load-tileset', () => {
  if (framed) return;
  framed = true;
  frameTileset(splatTiles);
  document.getElementById('loading').style.display = 'none';
});

// ─── Resize ───────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  imageryTiles.setResolutionFromRenderer(camera, renderer);
  splatTiles.setResolutionFromRenderer(camera, renderer);
});

// ─── Render loop ──────────────────────────────────────────────────────────────

function frame() {
  controls.update();
  imageryTiles.update();
  splatTiles.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

frame();
