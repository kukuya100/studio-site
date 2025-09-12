import { useRef, useEffect } from 'react';
import {
  Clock as e,
  PerspectiveCamera as t,
  Scene as i,
  WebGLRenderer as s,
  SRGBColorSpace as n,
  TextureLoader as TL,
  MathUtils as o,
  Vector2 as r,
  Vector3 as a,
  MeshPhysicalMaterial as c,
  MeshBasicMaterial as b,      // ✅ 로고 공은 Basic (조명/톤매핑 무시)
  Mesh as q,
  ShaderChunk as h,
  Color as l,
  Object3D as m,
  InstancedMesh as d,
  PMREMGenerator as p,
  SphereGeometry as g,
  AmbientLight as f,
  PointLight as u,
  ACESFilmicToneMapping as v,
  Raycaster as y,
  Plane as w,
  CanvasTexture as CT         // ✅ 캔버스 합성 텍스처
} from 'three';
import { RoomEnvironment as z } from 'three/examples/jsm/environments/RoomEnvironment.js';

/* ------------------------------------------------
   렌더 엔진 (x)
------------------------------------------------- */
class x {
  #e;
  canvas;
  camera;
  cameraMinAspect;
  cameraMaxAspect;
  cameraFov;
  maxPixelRatio;
  minPixelRatio;
  scene;
  renderer;
  #t;
  size = { width: 0, height: 0, wWidth: 0, wHeight: 0, ratio: 0, pixelRatio: 0 };
  render = this.#i;
  onBeforeRender = () => {};
  onAfterRender = () => {};
  onAfterResize = () => {};
  #s = false;
  #n = false;
  isDisposed = false;
  #o;
  #r;
  #a;
  #c = new e();
  #h = { elapsed: 0, delta: 0 };
  #l;

  // 안정화 옵션
  ignoreMinorResizes = true;
  minorResizeThreshold = 120;
  lockPixelRatio = false;
  #initialPixelRatio = null;

  // 기준 사이즈
  #baseline = { w: 0, h: 0 };
  #lastApplied = { w: 0, h: 0 };

  constructor(e) {
    this.#e = { ...e };
    if (typeof this.#e.ignoreMinorResizes === 'boolean') this.ignoreMinorResizes = this.#e.ignoreMinorResizes;
    if (typeof this.#e.minorResizeThreshold === 'number') this.minorResizeThreshold = this.#e.minorResizeThreshold;
    if (typeof this.#e.lockPixelRatio === 'boolean') this.lockPixelRatio = this.#e.lockPixelRatio;

    this.#m();
    this.#d();
    this.#p();

    this.resize(true);
    setTimeout(() => this.resize(true), 600);
    this.#g();
  }

  #m() { this.camera = new t(); this.cameraFov = this.camera.fov; }
  #d() { this.scene = new i(); }
  #p() {
    if (this.#e.canvas) this.canvas = this.#e.canvas;
    else if (this.#e.id) this.canvas = document.getElementById(this.#e.id);
    else console.error('Three: Missing canvas or id parameter');

    this.canvas.style.display = 'block';
    const e = {
      canvas: this.canvas,
      powerPreference: 'high-performance',
      ...(this.#e.rendererOptions ?? {})
    };
    this.renderer = new s(e);
    this.renderer.outputColorSpace = n;
  }
  #g() {
    if (!(this.#e.size instanceof Object)) {
      window.addEventListener('resize', this.#f.bind(this));
      if (this.#e.size === 'parent' && this.canvas.parentNode) {
        this.#r = new ResizeObserver(this.#f.bind(this));
        this.#r.observe(this.canvas.parentNode);
      }
    }
    this.#o = new IntersectionObserver(this.#u.bind(this), { root: null, rootMargin: '0px', threshold: 0 });
    this.#o.observe(this.canvas);
    document.addEventListener('visibilitychange', this.#v.bind(this));
  }
  #y() {
    window.removeEventListener('resize', this.#f.bind(this));
    this.#r?.disconnect();
    this.#o?.disconnect();
    document.removeEventListener('visibilitychange', this.#v.bind(this));
  }
  #u(e) { this.#s = e[0].isIntersecting; this.#s ? this.#w() : this.#z(); }
  #v() { if (this.#s) document.hidden ? this.#z() : this.#w(); }
  #f() { if (this.#a) clearTimeout(this.#a); this.#a = setTimeout(this.resize.bind(this), 250); }

  #measure() {
    const parent = this.canvas.parentNode;
    const rect = parent?.getBoundingClientRect?.();
    const fromParent = { w: Math.round(rect?.width || 0), h: Math.round(rect?.height || 0) };

    const vv = window.visualViewport;
    const fromViewport = {
      w: Math.round(Math.max(window.innerWidth, document.documentElement.clientWidth, vv?.width || 0)),
      h: Math.round(Math.max(window.innerHeight, document.documentElement.clientHeight, vv?.height || 0)) + 150
    };

    if (this.#e.size === 'parent') {
      return { w: Math.max(fromParent.w, fromViewport.w), h: Math.max(fromParent.h, fromViewport.h) };
    }
    return fromViewport;
  }

  resize(force = false) {
    if (!force && INTERACTING) return;

    let { w: e, h: t } = this.#e.size instanceof Object
      ? { w: this.#e.size.width, h: this.#e.size.height }
      : this.#measure();

    // 최초 기준 업데이트(더 큰 값만 반영)
    this.#baseline.w = Math.max(this.#baseline.w, e);
    this.#baseline.h = Math.max(this.#baseline.h, t);

    const prevW = this.#lastApplied.w || this.size.width || e;
    const prevH = this.#lastApplied.h || this.size.height || t;
    const dW = Math.abs(e - prevW);
    const dH = Math.abs(t - prevH);
    const orientationChanged = (e > t) !== (prevW > prevH);

    if (!force && this.ignoreMinorResizes && !orientationChanged && dW <= 2 && dH < this.minorResizeThreshold) {
      return;
    }

    if (!orientationChanged) {
      e = Math.max(e, this.#baseline.w - 2);
      t = Math.max(t, this.#baseline.h - 2);
    } else {
      this.#baseline = { w: e, h: t };
    }

    this.#lastApplied = { w: e, h: t };

    this.size.width = e;
    this.size.height = t;
    this.size.ratio = e / t;
    this.#x();
    this.#b();
    this.onAfterResize(this.size);
  }

  #x() {
    this.camera.aspect = this.size.width / this.size.height;
    if (this.camera.isPerspectiveCamera && this.cameraFov) {
      if (this.cameraMinAspect && this.camera.aspect < this.cameraMinAspect) this.#A(this.cameraMinAspect);
      else if (this.cameraMaxAspect && this.camera.aspect > this.cameraMaxAspect) this.#A(this.cameraMaxAspect);
      else this.camera.fov = this.cameraFov;
    }
    this.camera.updateProjectionMatrix();
    this.updateWorldSize();
  }
  #A(e) {
    const t = Math.tan(o.degToRad(this.cameraFov / 2)) / (this.camera.aspect / e);
    this.camera.fov = 2 * o.radToDeg(Math.atan(t));
  }
  updateWorldSize() {
    if (this.camera.isPerspectiveCamera) {
      const e = (this.camera.fov * Math.PI) / 180;
      this.size.wHeight = 2 * Math.tan(e / 2) * this.camera.position.length();
      this.size.wWidth = this.size.wHeight * this.camera.aspect;
    }
  }
  #b() {
    this.renderer.setSize(this.size.width, this.size.height);

    let pr = window.devicePixelRatio || 1;
    if (this.lockPixelRatio) {
      if (this.#initialPixelRatio == null) this.#initialPixelRatio = pr;
      pr = this.#initialPixelRatio;
    }
    if (this.maxPixelRatio && pr > this.maxPixelRatio) pr = this.maxPixelRatio;
    if (this.minPixelRatio && pr < this.minPixelRatio) pr = this.minPixelRatio;
    if (!this.minPixelRatio) pr = Math.max(1, pr);
    if (!this.maxPixelRatio) pr = Math.min(2.5, pr);

    this.renderer.setPixelRatio(pr);
    this.size.pixelRatio = pr;
    this.#t?.setSize?.(this.size.width, this.size.height);
  }
  get postprocessing() { return this.#t; }
  set postprocessing(e) { this.#t = e; this.render = e.render.bind(e); }

  #w() {
    if (this.#n) return;
    const animate = () => {
      this.#l = requestAnimationFrame(animate);
      this.#h.delta = this.#c.getDelta();
      this.#h.elapsed += this.#h.delta;
      this.onBeforeRender(this.#h);
      this.render();
      this.onAfterRender(this.#h);
    };
    this.#n = true;
    this.#c.start();
    animate();
  }
  #z() {
    if (this.#n) {
      cancelAnimationFrame(this.#l);
      this.#n = false;
      this.#c.stop();
    }
  }
  #i() { this.renderer.render(this.scene, this.camera); }
  clear() {
    this.scene.traverse(e => {
      if (e.isMesh && typeof e.material === 'object' && e.material !== null) {
        Object.keys(e.material).forEach(t => {
          const i = e.material[t];
          if (i !== null && typeof i === 'object' && typeof i.dispose === 'function') i.dispose();
        });
        e.material.dispose();
        e.geometry.dispose();
      }
    });
    this.scene.clear();
  }
  dispose() {
    this.#y();
    this.#z();
    this.clear();
    this.#t?.dispose?.();
    this.renderer.dispose();
    this.isDisposed = true;
  }
}

/* ------------------------------------------------
   입력 라우팅 (pointer/touch)
------------------------------------------------- */
const map = new Map();
const A = new r();
let R = false;
let INTERACTING = false;

function isEventOn(elem, ev) {
  if (!ev) return true;
  const tgt = ev.target;
  if (!tgt) return false;
  if (typeof ev.composedPath === 'function' && ev.composedPath().includes(elem)) return true;
  if (elem === tgt || elem.contains?.(tgt)) return true;
  const rect = elem.getBoundingClientRect();
  const x = A.x, y = A.y;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}
function attach(e) {
  const t = {
    position: new r(),
    nPosition: new r(),
    hover: false,
    touching: false,
    onEnter() {},
    onMove() {},
    onClick() {},
    onLeave() {},
    ...e
  };
  (function (elem, t) {
    if (!map.has(elem)) {
      map.set(elem, t);
      if (!R) {
        document.body.addEventListener('pointermove', onPointerMove, { passive: true });
        document.body.addEventListener('pointerleave', onPointerLeave, { passive: true });
        document.body.addEventListener('click', onClick, { passive: true });
        document.body.addEventListener('touchstart', onTouchStart, { passive: true });
        document.body.addEventListener('touchmove', onTouchMove, { passive: true });
        document.body.addEventListener('touchend', onTouchEnd, { passive: true });
        document.body.addEventListener('touchcancel', onTouchEnd, { passive: true });
        R = true;
      }
    }
  })(e.domElement, t);
  t.dispose = () => {
    const elem = e.domElement;
    map.delete(elem);
    if (map.size === 0) {
      document.body.removeEventListener('pointermove', onPointerMove);
      document.body.removeEventListener('pointerleave', onPointerLeave);
      document.body.removeEventListener('click', onClick);
      document.body.removeEventListener('touchstart', onTouchStart);
      document.body.removeEventListener('touchmove', onTouchMove);
      document.body.removeEventListener('touchend', onTouchEnd);
      document.body.removeEventListener('touchcancel', onTouchEnd);
      R = false;
    }
  };
  return t;
}
function onPointerMove(e) { A.x = e.clientX; A.y = e.clientY; interact(e); }
function onPointerLeave() { for (const t of map.values()) { if (t.hover) { t.hover = false; t.onLeave(t); } } }
function onClick(e) {
  A.x = e.clientX; A.y = e.clientY;
  for (const [elem, t] of map) {
    if (!isEventOn(elem, e)) continue;
    const rect = elem.getBoundingClientRect();
    updateNormPos(t, rect);
    if (hit(rect)) t.onClick(t);
  }
}
function onTouchStart(e) {
  if (e.touches.length > 0) {
    INTERACTING = true;
    A.x = e.touches[0].clientX; A.y = e.touches[0].clientY;
    for (const [elem, t] of map) {
      if (!isEventOn(elem, e)) continue;
      const rect = elem.getBoundingClientRect();
      if (hit(rect)) {
        t.touching = true;
        updateNormPos(t, rect);
        if (!t.hover) { t.hover = true; t.onEnter(t); }
        t.onMove(t);
      }
    }
  }
}
function onTouchMove(e) {
  if (e.touches.length > 0) {
    A.x = e.touches[0].clientX; A.y = e.touches[0].clientY;
    for (const [elem, t] of map) {
      if (!isEventOn(elem, e)) continue;
      const rect = elem.getBoundingClientRect();
      updateNormPos(t, rect);
      if (hit(rect)) {
        if (!t.hover) { t.hover = true; t.touching = true; t.onEnter(t); }
        t.onMove(t);
      } else if (t.hover && t.touching) {
        t.hover = false; t.touching = false; t.onLeave(t);
      }
    }
  }
}
function onTouchEnd() {
  INTERACTING = false;
  for (const [, t] of map) {
    if (t.touching) {
      t.touching = false;
      if (t.hover) { t.hover = false; t.onLeave(t); }
    }
  }
}
function interact(ev) {
  for (const [elem, t] of map) {
    if (!isEventOn(elem, ev)) {
      if (t.hover && !t.touching) { t.hover = false; t.onLeave(t); }
      continue;
    }
    const rect = elem.getBoundingClientRect();
    if (hit(rect)) {
      updateNormPos(t, rect);
      if (!t.hover) { t.hover = true; t.onEnter(t); }
      t.onMove(t);
    } else if (t.hover && !t.touching) {
      t.hover = false; t.onLeave(t);
    }
  }
}
function updateNormPos(t, rect) {
  const { position: i, nPosition: s } = t;
  i.x = A.x - rect.left;
  i.y = A.y - rect.top;
  s.x = (i.x / rect.width) * 2 - 1;
  s.y = (-i.y / rect.height) * 2 + 1;
}
function hit(rect) {
  const { x, y } = A;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/* ------------------------------------------------
   물리 & 렌더 오브젝트 (Z)
------------------------------------------------- */
const { randFloat: k, randFloatSpread: E } = o;
const F = new a(), I = new a(), O = new a(), V = new a(), B = new a(), N = new a(), _ = new a(), j = new a(), H = new a(), T = new a();

class W {
  constructor(e) {
    this.config = e;
    this.positionData = new Float32Array(3 * e.count).fill(0);
    this.velocityData = new Float32Array(3 * e.count).fill(0);
    this.sizeData = new Float32Array(e.count).fill(1);
    this.center = new a();
    this.#R();
    this.setSizes();
  }
  #R() {
    const { config: e, positionData: t } = this;
    this.center.toArray(t, 0);
    for (let i = 1; i < e.count; i++) {
      const s = 3 * i;
      t[s] = E(2 * e.maxX);
      t[s + 1] = E(2 * e.maxY);
      t[s + 2] = E(2 * e.maxZ);
    }
  }
  setSizes() {
    const { config: e, sizeData: t } = this;
    t[0] = e.size0;
    for (let i = 1; i < e.count; i++) t[i] = k(e.minSize, e.maxSize);
  }
  update(e) {
    const { config: t, center: i, positionData: s, sizeData: n, velocityData: o } = this;
    let r0 = 0;
    if (t.controlSphere0) {
      r0 = 1;
      F.fromArray(s, 0);
      F.lerp(i, 0.1).toArray(s, 0);
      V.set(0, 0, 0).toArray(o, 0);
    }
    for (let idx = r0; idx < t.count; idx++) {
      const base = 3 * idx;
      I.fromArray(s, base);
      B.fromArray(o, base);
      B.y -= e.delta * t.gravity * n[idx];
      B.multiplyScalar(t.friction);
      B.clampLength(0, t.maxVelocity);
      I.add(B);
      I.toArray(s, base);
      B.toArray(o, base);
    }
    for (let idx = r0; idx < t.count; idx++) {
      const base = 3 * idx;
      I.fromArray(s, base);
      B.fromArray(o, base);
      const radius = n[idx];
      for (let jdx = idx + 1; jdx < t.count; jdx++) {
        const otherBase = 3 * jdx;
        O.fromArray(s, otherBase);
        N.fromArray(o, otherBase);
        const otherRadius = n[jdx];
        _.copy(O).sub(I);
        const dist = _.length();
        const sumRadius = radius + otherRadius;
        if (dist < sumRadius) {
          const overlap = sumRadius - dist;
          j.copy(_).normalize().multiplyScalar(0.5 * overlap);
          H.copy(j).multiplyScalar(Math.max(B.length(), 1));
          T.copy(j).multiplyScalar(Math.max(N.length(), 1));
          I.sub(j); B.sub(H); I.toArray(s, base); B.toArray(o, base);
          O.add(j); N.add(T); O.toArray(s, otherBase); N.toArray(o, otherBase);
        }
      }
      if (t.controlSphere0) {
        _.copy(F).sub(I);
        const dist = _.length();
        const sumRadius0 = radius + n[0];
        if (dist < sumRadius0) {
          const diff = sumRadius0 - dist;
          j.copy(_.normalize()).multiplyScalar(diff);
          H.copy(j).multiplyScalar(Math.max(B.length(), 2));
          I.sub(j); B.sub(H);
        }
      }
      if (Math.abs(I.x) + radius > t.maxX) { I.x = Math.sign(I.x) * (t.maxX - radius); B.x = -B.x * t.wallBounce; }
      if (t.gravity === 0) {
        if (Math.abs(I.y) + radius > t.maxY) { I.y = Math.sign(I.y) * (t.maxY - radius); B.y = -B.y * t.wallBounce; }
      } else if (I.y - radius < -t.maxY) {
        I.y = -t.maxY + radius; B.y = -B.y * t.wallBounce;
      }
      const maxBoundary = Math.max(t.maxZ, t.maxSize);
      if (Math.abs(I.z) + radius > maxBoundary) { I.z = Math.sign(I.z) * (t.maxZ - radius); B.z = -B.z * t.wallBounce; }
      I.toArray(s, base); B.toArray(o, base);
    }
  }
}

class Y extends c {
  constructor(e) {
    super(e);
    this.uniforms = {
      thicknessPower: { value: 2 },
      thicknessScale: { value: 10 },
      thicknessDistortion: { value: 0.1 },
      thicknessAmbient: { value: 0 },
      thicknessAttenuation: { value: 0.1 }
    };
    this.defines.USE_UV = '';
    this.onBeforeCompile = (e) => {
      Object.assign(e.uniforms, this.uniforms);
      e.fragmentShader =
        '\nuniform float thicknessPower;uniform float thicknessScale;uniform float thicknessDistortion;uniform float thicknessAmbient;uniform float thicknessAttenuation;\n' +
        e.fragmentShader;
      e.fragmentShader = e.fragmentShader.replace(
        'void main() {',
        `
        void RE_Direct_Scattering(const in IncidentLight directLight, const in vec2 uv, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, inout ReflectedLight reflectedLight) {
          vec3 scatteringHalf = normalize(directLight.direction + (geometryNormal * thicknessDistortion));
          float scatteringDot = pow(saturate(dot(geometryViewDir, -scatteringHalf)), thicknessPower) * thicknessScale;
          #ifdef USE_COLOR
            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * vColor;
          #else
            vec3 scatteringIllu = (scatteringDot + thicknessAmbient) * diffuse;
          #endif
          reflectedLight.directDiffuse += scatteringIllu * thicknessAttenuation * directLight.color;
        }
        void main() {
        `
      );
      const t = h.lights_fragment_begin.replaceAll(
        'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );',
        `
          RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
          RE_Direct_Scattering(directLight, vUv, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, reflectedLight);
        `
      );
      e.fragmentShader = e.fragmentShader.replace('#include <lights_fragment_begin>', t);
      this.onBeforeCompile2?.(e);
    };
  }
}

const X = {
  count: 200,
  colors: [0, 0, 0],
  ambientColor: 0xffffff,
  ambientIntensity: 1,
  lightIntensity: 200,
  materialParams: {
    metalness: 0.5,
    roughness: 0.5,
    clearcoat: 1,
    clearcoatRoughness: 0.15
  },
  minSize: 0.5,
  maxSize: 1,
  size0: 1,
  gravity: 0.5,
  friction: 0.9975,
  wallBounce: 0.95,
  maxVelocity: 0.15,
  maxX: 5,
  maxY: 5,
  maxZ: 2,
  controlSphere0: false,
  followCursor: true
};

const U = new m();

/* ------------------------------------------------
   InstancedMesh + 로고 Mesh 컨테이너 (Z)
------------------------------------------------- */
class Z extends m {
  constructor(renderer, t = {}) {
    super();
    this.config = { ...X, ...t };

    // 환경맵
    const env = new z();
    const pmrem = new p(renderer);
    const envTex = pmrem.fromScene(env, 0.04).texture;

    // 나머지 공들용 InstancedMesh
    const geom = new g();
    const instMat = new Y({ envMap: envTex, ...this.config.materialParams });
    instMat.envMapRotation.x = -Math.PI / 2;

    this.im = new d(geom, instMat, Math.max(0, this.config.count - 1));
    this.add(this.im);

    // 물리
    this.physics = new W(this.config);

    // 라이트
    this.ambientLight = new f(this.config.ambientColor, this.config.ambientIntensity);
    this.add(this.ambientLight);
    this.light = new u(0xffffff, this.config.lightIntensity);
    this.add(this.light);

    // 컬러 그라데이션
    this.setColors(this.config.colors);

    // 로고 공 (조명/톤매핑 무시, 불투명)
    // const logoTex = this.config.logoTexture || null;
    // const logoMat = new b({
    //   map: logoTex || null,
    //   transparent: false,    // ✅ 마스크 방지 (투명 OFF)
    //   toneMapped: false,     // ✅ ACES 무시 → 색 보존
    //   depthTest: true,
    //   depthWrite: true
    // });


    // 로고 공 (조명 받음, PBR)
   const logoTex = this.config.logoTexture || null;
   const logoMat = new c({
   map: logoTex || null,
   envMap: envTex,            // 환경맵 반사
   metalness: 0.35,
   roughness: 0.5,
   clearcoat: 1,
   clearcoatRoughness: 0.2,
   transparent: false,        // ✅ 계속 불투명 (마스크 금지)
   toneMapped: true,          // ✅ 조명/ACES 적용
   // 살짝 기본 밝기 유지하고 싶으면 아래 3줄 추가(옵션)
   emissive: new l(0xffffff),
   emissiveMap: logoTex || null,
   emissiveIntensity: 0.12,
 });





    this.logoBall = new q(new g(), logoMat);
    this.logoBall.renderOrder = 999;
    this.add(this.logoBall);
  }

  setColors(cols) {
    if (Array.isArray(cols) && cols.length > 1) {
      const grad = (() => {
        let raw, arr;
        function setColors(e) { raw = e; arr = e.map(c => new l(c)); }
        setColors(cols);
        return {
          getColorAt(ratio, out = new l()) {
            const scaled = Math.max(0, Math.min(1, ratio)) * (raw.length - 1);
            const idx = Math.floor(scaled);
            const start = arr[idx];
            if (idx >= raw.length - 1) return start.clone();
            const alpha = scaled - idx;
            const end = arr[idx + 1];
            out.r = start.r + alpha * (end.r - start.r);
            out.g = start.g + alpha * (end.g - start.g);
            out.b = start.b + alpha * (end.b - start.b);
            return out;
          }
        };
      })();

      for (let instIdx = 0; instIdx < this.im.count; instIdx++) {
        const ratio = (instIdx + 1) / this.config.count; // 0번(로고) 제외
        this.im.setColorAt(instIdx, grad.getColorAt(ratio));
      }
      this.im.instanceColor && (this.im.instanceColor.needsUpdate = true);
      this.light.color.copy(grad.getColorAt(0));
    }
  }

  update(e) {
    this.physics.update(e);

    // 0번(로고) 위치/스케일
    U.position.fromArray(this.physics.positionData, 0);
    const logoScale = this.config.followCursor === false ? 0 : this.physics.sizeData[0];
    U.scale.setScalar(logoScale);
    this.logoBall.position.copy(U.position);
    this.logoBall.scale.copy(U.scale);
    this.light.position.copy(U.position);

    // 나머지 (1..count-1) → InstancedMesh 채우기
    for (let idx = 1; idx < this.config.count; idx++) {
      U.position.fromArray(this.physics.positionData, 3 * idx);
      U.scale.setScalar(this.physics.sizeData[idx]);
      U.updateMatrix();
      this.im.setMatrixAt(idx - 1, U.matrix);
    }
    this.im.instanceMatrix.needsUpdate = true;
  }
}

/* ------------------------------------------------
   투명 PNG → 배경합성 CanvasTexture (불투명)
------------------------------------------------- */
 function composeLogoTexture(
   rawTex,
   { bg = '#ffffff', scale = 0.65, flipY = false, shiftX = 0, shiftY = 0 } = {}
 ) {
  const img = rawTex.image;
  const S = Math.max(img.width, img.height);
  const size = Math.min(2048, Math.pow(2, Math.ceil(Math.log2(S))));
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');

  // 배경 채우기 → 투명영역 제거(마스크 방지)
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // 로고 비율 유지, 중앙 배치
  const target = size * Math.max(0.1, Math.min(1, scale));
  const aspect = img.width / img.height;
  let w, h;
  if (aspect >= 1) { w = target; h = target / aspect; }
  else { h = target; w = target * aspect; }
 // 중앙 기준으로 이동/플립 적용
 ctx.save();
 ctx.translate(size / 2 + shiftX * size, size / 2 + shiftY * size);
 if (flipY) ctx.scale(1, -1); // ⬅️ 위아래 뒤집기
 ctx.drawImage(img, -w / 2, -h / 2, w, h);
 ctx.restore();

  const tex = new CT(cv);
  tex.colorSpace = n;
  tex.flipY = false; // SphereGeometry 기본 UV에 맞춤
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------------------------
   외부 API (createBallpit + React 컴포넌트)
------------------------------------------------- */
function createBallpit(canvas, opts = {}) {
  const i = new x({
    canvas,
    size: 'parent',
    rendererOptions: { antialias: true, alpha: true },
    ignoreMinorResizes: opts.ignoreMinorResizes ?? true,
    minorResizeThreshold: opts.minorResizeThreshold ?? 120,
    lockPixelRatio: opts.lockPixelRatio ?? false,
    minPixelRatio: 1,
    maxPixelRatio: 2.5
  });

  let inst;
  i.renderer.toneMapping = v;
  i.camera.position.set(0, 0, 20);
  i.camera.lookAt(0, 0, 0);
  i.cameraMaxAspect = 1.5;

  // 로고 텍스처 로드 (BASE_URL 반영)
  const texLoader = new TL();
  let logoTexture = null;
  texLoader.load(
    opts.logoUrl || '/images/logo.png',
    (raw) => {
      raw.colorSpace = n;
      raw.needsUpdate = true;
      // ✅ 투명 PNG → 배경 합성 (불투명)으로 교체
      const composed = composeLogoTexture(raw, {
        bg: '#ffffff',           // 필요 시 브랜드 색으로 변경
        scale: 0.2,              // 로고 크기 비율(0~1)
        flipY: true,
        shiftX: -0.25
      });
      logoTexture = composed;

      // 이미 장면이 만들어진 상태면 즉시 교체
      if (inst?.logoBall?.material) {
        inst.logoBall.material.map = composed;
        inst.logoBall.material.transparent = false;
        inst.logoBall.material.needsUpdate = true;
      }
    },
    undefined,
    () => { console.warn('[Ballpit] logo 텍스처를 불러오지 못했습니다:', opts.logoUrl); }
  );

  init(opts);

  const ray = new y();
  const plane = new w(new a(0, 0, 1), 0);
  const hit = new a();
  let paused = false;

  canvas.style.touchAction = 'pan-y';
  canvas.style.userSelect = 'none';
  canvas.style.webkitUserSelect = 'none';

  const input = attach({
    domElement: canvas,
    onMove() {
      ray.setFromCamera(input.nPosition, i.camera);
      i.camera.getWorldDirection(plane.normal);
      ray.ray.intersectPlane(plane, hit);
      inst.physics.center.copy(hit);
      inst.config.controlSphere0 = true;
    },
    onLeave() { inst.config.controlSphere0 = false; }
  });

  function init(cfg) {
    if (inst) { i.clear(); i.scene.remove(inst); }
    // 초기엔 logoTexture가 null일 수 있음 → 이후 onLoad에서 즉시 material.map 교체
    inst = new Z(i.renderer, { ...cfg, logoTexture });
    i.scene.add(inst);
  }

  i.onBeforeRender = e => { if (!paused) inst.update(e); };
  i.onAfterResize = e => {
    inst.config.maxX = e.wWidth / 2;
    inst.config.maxY = e.wHeight / 2;
  };

  return {
    three: i,
    get spheres() { return inst; },
    setCount(c) { init({ ...inst.config, count: c }); },
    togglePause() { paused = !paused; },
    dispose() { input.dispose(); i.dispose(); }
  };
}

const Ballpit = ({ className = '', followCursor = true, logoUrl = '/images/logo.png', ...props }) => {
  const canvasRef = useRef(null);
  const ref = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ref.current = createBallpit(canvas, { followCursor, logoUrl, ...props });
    return () => ref.current?.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      className={className}
      ref={canvasRef}
      style={{ width: '100%', height: '100%', touchAction: 'pan-y' }}
    />
  );
};

export default Ballpit;
