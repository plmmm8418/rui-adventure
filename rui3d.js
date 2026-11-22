// 小睿闆 3D 主角：只用旅行島共用的 rui-game.glb（照真人參考做的新建模）
// 模型沒有內建動作，所以用整體的跳躍、轉圈、搖頭做反應。
import * as T from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

let renderer, scene, camera, root, host = null, ro = null;
let state = 'idle', t0 = 0, ready = false;
const readyCbs = [];

export function initRui(url) {
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) { console.warn('WebGL 不可用', e); return; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.domElement.className = 'rui3d';
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(26, 1, 0.05, 50);
  camera.position.set(0, 0.95, 3.6);
  camera.lookAt(0, 0.9, 0);
  scene.add(new T.HemisphereLight(0xffffff, 0xffe6cc, 2.3));
  const sun = new T.DirectionalLight(0xffffff, 1.5);
  sun.position.set(1.2, 3, 2.6);
  scene.add(sun);
  root = new T.Group();
  scene.add(root);

  new GLTFLoader().load(url, (g) => {
    const model = g.scene;
    model.traverse((m) => {
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mat) => {
        if (!mat) return;
        if ('metalness' in mat) mat.metalness = 0;
        if ('roughness' in mat) mat.roughness = Math.max(mat.roughness ?? 0.8, 0.75);
        if ('specularIntensity' in mat) mat.specularIntensity = 0.4;
      });
    });
    const box = new T.Box3().setFromObject(model);
    const size = box.getSize(new T.Vector3());
    model.scale.setScalar(1.54 / size.y);
    box.setFromObject(model);
    const c = box.getCenter(new T.Vector3());
    model.position.x -= c.x;
    model.position.z -= c.z;
    model.position.y -= box.min.y;
    root.add(model);
    ready = true;
    readyCbs.splice(0).forEach((f) => f());
    if (host) host.classList.add('has3d');
    renderer.render(scene, camera);
  }, undefined, (e) => console.warn('小睿闆模型載入失敗', e));

  requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestAnimationFrame(loop); });
}

function fit() {
  if (!host || !renderer) return;
  const w = host.clientWidth, h = host.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // 寬的框也要看得到整個人
  camera.position.z = camera.aspect < 1 ? 3.6 / Math.max(camera.aspect, 0.6) : 3.6;
  camera.updateProjectionMatrix();
  if (ready) renderer.render(scene, camera);
}

export function attachRui(el) {
  if (!renderer || !el) return;
  host = el;
  el.appendChild(renderer.domElement);
  if (ready) el.classList.add('has3d');
  if (ro) ro.disconnect();
  ro = new ResizeObserver(fit);
  ro.observe(el);
  fit();
}

export function cheerRui() { state = 'cheer'; t0 = performance.now(); }
export function sadRui() { state = 'sad'; t0 = performance.now(); }
export function helloRui() { state = 'hello'; t0 = performance.now(); }
export function onRuiReady(f) { ready ? f() : readyCbs.push(f); }

function loop(now) {
  if (document.hidden) return;
  requestAnimationFrame(loop);
  if (!ready || !host || !host.isConnected || host.offsetParent === null) return;
  const t = now / 1000;
  let y = 0, ry = Math.sin(t * 0.9) * 0.28, rz = 0, sy = 1 + Math.sin(t * 2.6) * 0.012, sx = 1;
  const p = (now - t0) / (state === 'cheer' ? 950 : 900);
  if (state !== 'idle' && p >= 1) state = 'idle';
  if (state === 'cheer') {
    y = Math.sin(Math.min(p * 1.15, 1) * Math.PI) * 0.22;
    ry = p * Math.PI * 2;
    if (p < 0.12 || p > 0.88) { sy = 0.9; sx = 1.06; }
  } else if (state === 'sad') {
    rz = Math.sin(p * Math.PI * 4) * 0.12 * (1 - p);
    ry = Math.sin(p * Math.PI * 2) * 0.35;
  } else if (state === 'hello') {
    y = Math.abs(Math.sin(p * Math.PI * 2)) * 0.12;
    rz = Math.sin(p * Math.PI * 2) * 0.08;
  }
  root.position.y = y;
  root.rotation.set(0, ry, rz);
  root.scale.set(sx, sy, sx);
  renderer.render(scene, camera);
}
