import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import { useEffect, useRef } from "react";
import "./CircularGallery.css";

/* ---------- helpers ---------- */
const lerp = (a, b, t) => a + (b - a) * t;
const debounce = (fn, ms) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; };

function createTextTexture(gl, text, font = "bold 28px system-ui, sans-serif", color = "#fff") {
  const cvs = document.createElement("canvas");
  const ctx = cvs.getContext("2d");
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width);
  const h = Math.ceil(parseInt(font, 10) * 1.25);
  cvs.width = w + 40;
  cvs.height = h + 24;

  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fillRect(0, 0, cvs.width, cvs.height);
  ctx.fillStyle = color;
  ctx.fillText(text, cvs.width / 2, cvs.height / 2);

  const tex = new Texture(gl, { generateMipmaps: false });
  tex.image = cvs;
  return { texture: tex, width: cvs.width, height: cvs.height };
}

class Title {
  constructor({ gl, plane, text, color, font }) {
    const { texture, width, height } = createTextTexture(gl, text, font, color);
    const geometry = new Plane(gl);
    const program = new Program(gl, {
      vertex: `
        attribute vec3 position; attribute vec2 uv;
        uniform mat4 modelViewMatrix, projectionMatrix;
        varying vec2 vUv;
        void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragment: `
        precision highp float; uniform sampler2D tMap; varying vec2 vUv;
        void main(){ vec4 c=texture2D(tMap,vUv); if(c.a<0.05) discard; gl_FragColor=c; }`,
      uniforms: { tMap: { value: texture } },
      transparent: true, depthTest: false, depthWrite: false
    });
    this.mesh = new Mesh(gl, { geometry, program });
    const aspect = width / height;
    const hLabel = plane.scale.y * 0.16;
    const wLabel = hLabel * aspect;
    this.mesh.scale.set(wLabel, hLabel, 1);
    this.mesh.position.y = -plane.scale.y * 0.55 - hLabel * 0.25;
    this.mesh.setParent(plane);
  }
}

class Media {
  constructor({ gl, geometry, scene, renderer, screen, viewport, image, index, length, bend, text, textColor, borderRadius, font, payload }) {
    this.gl = gl; this.geometry = geometry; this.scene = scene; this.renderer = renderer;
    this.screen = screen; this.viewport = viewport; this.image = image;
    this.index = index; this.length = length; this.bend = bend;
    this.borderRadius = borderRadius; this.text = text; this.textColor = textColor; this.font = font;
    this.payload = payload; this.extra = 0;

    const tex = new Texture(gl, { generateMipmaps: true });
    this.program = new Program(gl, {
      depthTest: false, depthWrite: false, transparent: true,
      vertex: `
        precision highp float; attribute vec3 position; attribute vec2 uv;
        uniform mat4 modelViewMatrix, projectionMatrix; uniform float uTime, uSpeed; varying vec2 vUv;
        void main(){ vUv=uv; vec3 p=position;
          p.z=(sin(p.x*4.0+uTime)+cos(p.y*2.0+uTime))*0.6*(0.1+uSpeed*0.5);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
      fragment: `
        precision highp float; varying vec2 vUv;
        uniform sampler2D tMap; uniform vec2 uImageSizes, uPlaneSizes; uniform float uBorderRadius;
        float roundedBoxSDF(vec2 p, vec2 b, float r){ vec2 d=abs(p)-b; return length(max(d,vec2(0.0)))+min(max(d.x,d.y),0.0)-r; }
        void main(){
          vec2 ratio=vec2(
            min((uPlaneSizes.x/uPlaneSizes.y)/(uImageSizes.x/uImageSizes.y),1.0),
            min((uPlaneSizes.y/uPlaneSizes.x)/(uImageSizes.y/uImageSizes.x),1.0)
          );
          vec2 uv=vec2(vUv.x*ratio.x+(1.0-ratio.x)*0.5, vUv.y*ratio.y+(1.0-ratio.y)*0.5);
          vec4 c=texture2D(tMap, uv);
          float d=roundedBoxSDF(vUv-0.5, vec2(0.5-uBorderRadius), uBorderRadius);
          float aa=0.002; float alpha=1.0 - smoothstep(-aa, aa, d);
          gl_FragColor=vec4(c.rgb, alpha);
        }`,
      uniforms: {
        tMap: { value: tex },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: borderRadius }
      }
    });
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      tex.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };

    this.plane = new Mesh(gl, { geometry, program: this.program });
    this.plane.setParent(scene);

    this.title = new Title({ gl, plane: this.plane, text, color: textColor, font });

    this.onResize({});
  }

  update(scroll, direction) {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const halfW = this.viewport.width / 2;
    if (this.bend === 0) {
      this.plane.position.y = 0; this.plane.rotation.z = 0;
    } else {
      const B = Math.abs(this.bend);
      const R = (halfW * halfW + B * B) / (2.0 * B);
      const ex = Math.min(Math.abs(x), halfW);
      const arc = R - Math.sqrt(Math.max(0.0001, R * R - ex * ex));
      if (this.bend > 0) { this.plane.position.y = -arc; this.plane.rotation.z = -Math.sign(x) * Math.asin(ex / R); }
      else { this.plane.position.y = arc; this.plane.rotation.z = Math.sign(x) * Math.asin(ex / R); }
    }

    const speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = speed;

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width / 2;
    const isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    const isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === "right" && isBefore) this.extra -= this.widthTotal;
    if (direction === "left" && isAfter) this.extra += this.widthTotal;
  }

  onResize({ screen, viewport } = {}) {
    if (screen) this.screen = screen;
    if (viewport) this.viewport = viewport;

    const scaleBase = this.screen.height / 1500;
    this.plane.scale.y = (this.viewport.height * (880 * scaleBase)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (640 * scaleBase)) / this.screen.width;
    this.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];

    this.padding = 1.6;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

class GalleryApp {
  constructor(container, { items, bend = 3, textColor = "#fff", borderRadius = 0.06, font = "bold 28px system-ui, sans-serif", scrollSpeed = 2, scrollEase = 0.05, onItemClick } = {}) {
    this.container = container;
    this.onItemClick = onItemClick;
    this.scrollSpeed = scrollSpeed;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };

    this.isDown = false;
    this.dragPx = 0;
    this.startX = 0;

    this.snapDebounced = debounce(() => this.snapToCard(), 200);

    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize(); // initial
    this.createGeometry();
    this.createMedias(items, bend, textColor, borderRadius, font);
    this.addEvents();
    this.update();
  }

  createRenderer() {
    this.renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.gl.canvas);
    this.canvas = this.gl.canvas;

    // 모바일 제스처 설정
    this.canvas.style.touchAction = "pan-y";
    this.canvas.style.userSelect = "none";
    this.canvas.style.webkitUserSelect = "none";
  }

  createCamera() { this.camera = new Camera(this.gl); this.camera.fov = 45; this.camera.position.z = 20; }
  createScene() { this.scene = new Transform(); }
  createGeometry() { this.planeGeometry = new Plane(this.gl, { heightSegments: 50, widthSegments: 100 }); }

  createMedias(items, bend, textColor, borderRadius, font) {
    const defaults = [
      { image: `https://picsum.photos/seed/1/800/600`, text: "Bridge" },
      { image: `https://picsum.photos/seed/2/800/600`, text: "Desk Setup" },
      { image: `https://picsum.photos/seed/3/800/600`, text: "Waterfall" },
      { image: `https://picsum.photos/seed/4/800/600`, text: "Strawberries" },
      { image: `https://picsum.photos/seed/5/800/600`, text: "Deep Diving" }
    ];
    const base = items && items.length ? items : defaults;
    this.data = base.concat(base); // infinite loop
    this.medias = this.data.map((d, i) =>
      new Media({
        gl: this.gl, geometry: this.planeGeometry, scene: this.scene, renderer: this.renderer,
        screen: this.screen, viewport: this.viewport,
        image: d.image, index: i, length: this.data.length,
        bend, text: d.text || "", textColor, borderRadius, font, payload: d.payload
      })
    );
  }

  addEvents() {
    // 사이즈
    this.boundResize = this.onResize.bind(this);
    window.addEventListener("resize", this.boundResize, { passive: true });

    // 휠(데스크탑)
    this.boundWheel = this.onWheel.bind(this);
    this.canvas.addEventListener("wheel", this.boundWheel, { passive: true });

    // 포인터 (모바일/데스크탑 공통) → **캔버스에 직접 바인딩**
    this.boundDown = this.onPointerDown.bind(this);
    this.boundMove = this.onPointerMove.bind(this);
    this.boundUp = this.onPointerUp.bind(this);
    this.boundLeave = this.endDrag.bind(this);
    this.boundBlur = this.endDrag.bind(this);

    this.canvas.addEventListener("pointerdown", this.boundDown);
    this.canvas.addEventListener("pointermove", this.boundMove, { passive: false });
    this.canvas.addEventListener("pointerup", this.boundUp);
    this.canvas.addEventListener("pointercancel", this.boundUp);
    this.canvas.addEventListener("pointerleave", this.boundLeave);
    window.addEventListener("blur", this.boundBlur);
  }

  onWheel(e) {
    const delta = e.deltaY || e.wheelDelta || e.detail || 0;
    this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.25;
    this.snapDebounced();
  }

  onPointerDown(e) {
    this.isDown = true;
    this.dragPx = 0;
    this.scroll.position = this.scroll.current;
    this.startX = e.clientX ?? 0;

    // 포인터 캡처는 **캔버스**에
    try { this.canvas.setPointerCapture?.(e.pointerId); } catch {}
    // 수평 드래그 시작 시 수직 스크롤과 충돌 방지
    e.preventDefault?.();
  }

  onPointerMove(e) {
    if (!this.isDown) return;
    const x = e.clientX ?? 0;
    const dx = x - this.startX;
    this.dragPx = Math.max(this.dragPx, Math.abs(dx));
    this.scroll.target = this.scroll.position + (-dx) * (this.scrollSpeed * 0.025);
    e.preventDefault?.(); // iOS Safari 드래그 중 스크롤 방지
  }

  onPointerUp(e) {
    try { this.canvas.releasePointerCapture?.(e.pointerId); } catch {}
    this.endDrag();
  }

  endDrag() {
    if (!this.isDown) return;
    this.isDown = false;

    // 거의 움직이지 않았으면 클릭 처리
    if (this.dragPx < 10) this.fireClick();
    this.snapToCard();
  }

  fireClick() {
    if (!this.onItemClick || !this.medias?.length) return;
    const w = this.medias[0].width;
    const idx = Math.round(Math.abs(this.scroll.target) / w) % this.medias.length;
    const half = this.medias.length / 2;
    const baseIdx = idx % half;
    const baseItem = this.medias[baseIdx];
    const payload = baseItem?.payload || { title: baseItem?.text, cover: baseItem?.image };
    this.onItemClick(payload);
  }

  snapToCard() {
    if (!this.medias?.length) return;
    const w = this.medias[0].width;
    const i = Math.round(Math.abs(this.scroll.target) / w);
    const snap = w * i;
    this.scroll.target = this.scroll.target < 0 ? -snap : snap;
  }

  onResize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.screen = { width: w, height: h };
    this.renderer.setSize(w, h);
    this.camera.perspective({ aspect: w / h });

    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };

    if (this.medias) this.medias.forEach(m => m.onResize({ screen: this.screen, viewport: this.viewport }));
  }

  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const dir = this.scroll.current > this.scroll.last ? "right" : "left";
    this.medias?.forEach(m => m.update(this.scroll, dir));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = requestAnimationFrame(this.update.bind(this));
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.boundResize);
    this.canvas.removeEventListener("wheel", this.boundWheel);
    this.canvas.removeEventListener("pointerdown", this.boundDown);
    this.canvas.removeEventListener("pointermove", this.boundMove);
    this.canvas.removeEventListener("pointerup", this.boundUp);
    this.canvas.removeEventListener("pointercancel", this.boundUp);
    this.canvas.removeEventListener("pointerleave", this.boundLeave);
    window.removeEventListener("blur", this.boundBlur);
    this.renderer?.gl?.canvas?.parentNode?.removeChild(this.renderer.gl.canvas);
  }
}

/* ---------- React Wrapper ---------- */
export default function CircularGallery({
  items,
  bend = 3,
  textColor = "#ffffff",
  borderRadius = 0.06,
  font = "bold 28px system-ui, sans-serif",
  scrollSpeed = 2,
  scrollEase = 0.05,
  onItemClick
}) {
  const ref = useRef(null);

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const bendEff = isMobile ? Math.sign(bend) * Math.max(1, Math.abs(bend) * 0.45) : bend;

    const app = new GalleryApp(ref.current, {
      items, bend: bendEff, textColor, borderRadius, font, scrollSpeed, scrollEase, onItemClick
    });
    return () => app.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items), bend, textColor, borderRadius, font, scrollSpeed, scrollEase, onItemClick]);

  return <div className="circular-gallery" ref={ref} />;
}
