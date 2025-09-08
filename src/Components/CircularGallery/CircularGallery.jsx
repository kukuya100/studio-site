import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import { useEffect, useRef } from "react";
import "./CircularGallery.css";

/* ---------- helpers ---------- */
function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), wait);
  };
}
const lerp = (a, b, t) => a + (b - a) * t;

/* Canvas 텍스처로 라벨 그리기 */
function createTextTexture(gl, text, font = "bold 28px system-ui, sans-serif", color = "#ffffff") {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = font;
  const m = ctx.measureText(text);
  const textW = Math.ceil(m.width);
  const lineH = Math.ceil(parseInt(font, 10) * 1.25);
  canvas.width = textW + 40;          // padding
  canvas.height = lineH + 24;
  ctx.font = font;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 약간의 반투명 배경으로 가독성 확보
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = color;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

/* ---------- Title (라벨) ---------- */
class Title {
  constructor({ gl, plane, text, color = "#ffffff", font = "bold 28px system-ui, sans-serif" }) {
    this.gl = gl;
    this.plane = plane;
    this.text = text;
    this.color = color;
    this.font = font;
    this._create();
  }
  _create() {
    const { texture, width, height } = createTextTexture(this.gl, this.text, this.font, this.color);
    const geometry = new Plane(this.gl);
    const program = new Program(this.gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 c = texture2D(tMap, vUv);
          if (c.a < 0.05) discard;
          gl_FragColor = c;
        }`,
      uniforms: { tMap: { value: texture } },
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    this.mesh = new Mesh(this.gl, { geometry, program });

    const aspect = width / height;
    const labelH = this.plane.scale.y * 0.16;
    const labelW = labelH * aspect;
    this.mesh.scale.set(labelW, labelH, 1);
    // 카드 하단 살짝 아래
    this.mesh.position.y = -this.plane.scale.y * 0.55 - labelH * 0.25;
    this.mesh.setParent(this.plane);
  }
}

/* ---------- Media(한 장) ---------- */
class Media {
  constructor({
    gl,
    geometry,
    scene,
    renderer,
    screen,
    viewport,
    image,
    index,
    length,
    bend,
    text,
    textColor,
    borderRadius,
    font,
    payload
  }) {
    this.gl = gl;
    this.geometry = geometry;
    this.scene = scene;
    this.renderer = renderer;
    this.screen = screen;
    this.viewport = viewport;

    this.image = image;
    this.index = index;
    this.length = length;
    this.bend = bend;

    this.borderRadius = borderRadius;
    this.text = text;
    this.textColor = textColor;
    this.font = font;
    this.payload = payload;

    this.extra = 0;

    this._createProgram();
    this._createMesh();
    this._createTitle();
    this.onResize({});
  }

  _createProgram() {
    const texture = new Texture(this.gl, { generateMipmaps: true });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          // 살짝 살아있는 표면
          p.z = (sin(p.x * 4.0 + uTime) + cos(p.y * 2.0 + uTime)) * 0.6 * (0.1 + uSpeed * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;

        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }
        void main() {
          // object-fit: cover
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );

          vec4 color = texture2D(tMap, uv);

          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          float aa = 0.002;
          float alpha = 1.0 - smoothstep(-aa, aa, d);

          gl_FragColor = vec4(color.rgb, alpha);
        }`,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius }
      },
      transparent: true
    });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = this.image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }

  _createMesh() {
    this.plane = new Mesh(this.gl, {
      geometry: this.geometry,
      program: this.program
    });
    this.plane.setParent(this.scene);
  }

  _createTitle() {
    this.title = new Title({
      gl: this.gl,
      plane: this.plane,
      text: this.text,
      color: this.textColor,
      font: this.font
    });
  }

  update(scroll, direction) {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const halfW = this.viewport.width / 2;

    // 곡면 배치
    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      const B = Math.abs(this.bend);
      const R = (halfW * halfW + B * B) / (2.0 * B);
      const ex = Math.min(Math.abs(x), halfW);
      const arc = R - Math.sqrt(max(0.0001, R * R - ex * ex));
      if (this.bend > 0.0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(ex / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(ex / R);
      }
    }

    // 애니 파라미터
    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;

    // 무한 루프 재정렬
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

    // 카드 크기: 뷰포트 대비 비율
    const scaleBase = this.screen.height / 1500;
    // 모바일에서 더 넓게 보이도록 x 너비를 살짝 줄임
    this.plane.scale.y = (this.viewport.height * (880 * scaleBase)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (640 * scaleBase)) / this.screen.width;

    this.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];

    this.padding = 1.6;
    this.width = this.plane.scale.x + this.padding;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

function max(a, b) { return a > b ? a : b; }

/* ---------- GalleryApp (실제 동작) ---------- */
class GalleryApp {
  constructor(container, { items, bend = 3, textColor = "#ffffff", borderRadius = 0.06, font = "bold 28px system-ui, sans-serif", scrollSpeed = 2, scrollEase = 0.05, onItemClick } = {}) {
    this.container = container;
    this.scrollSpeed = scrollSpeed;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
    this.onItemClick = onItemClick;

    this._dragPx = 0;
    this.isDown = false;
    this._startX = 0;

    this._snapDebounced = debounce(() => this._snapToCard(), 200);

    this._createRenderer();
    this._createCamera();
    this._createScene();
    this._onResize();          // 초기 사이즈
    this._createGeometry();
    this._createMedias(items, bend, textColor, borderRadius, font);
    this._addEvents();
    this._update();
  }

  _createRenderer() {
    this.renderer = new Renderer({
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.gl.canvas);
  }
  _createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }
  _createScene() {
    this.scene = new Transform();
  }
  _createGeometry() {
    this.planeGeometry = new Plane(this.gl, { heightSegments: 50, widthSegments: 100 });
  }

  _createMedias(items, bend, textColor, borderRadius, font) {
    const defaults = [
      { image: `https://picsum.photos/seed/1/800/600`, text: "Bridge" },
      { image: `https://picsum.photos/seed/2/800/600`, text: "Desk Setup" },
      { image: `https://picsum.photos/seed/3/800/600`, text: "Waterfall" },
      { image: `https://picsum.photos/seed/4/800/600`, text: "Strawberries" },
      { image: `https://picsum.photos/seed/5/800/600`, text: "Deep Diving" }
    ];
    const galleryItems = items && items.length ? items : defaults;

    // 무한 순환을 위해 2배
    this.mediasData = galleryItems.concat(galleryItems);

    this.medias = this.mediasData.map((data, index) => {
      return new Media({
        gl: this.gl,
        geometry: this.planeGeometry,
        scene: this.scene,
        renderer: this.renderer,
        screen: this.screen,
        viewport: this.viewport,
        image: data.image,
        index,
        length: this.mediasData.length,
        bend,
        text: data.text || "",
        textColor,
        borderRadius,
        font,
        payload: data.payload // 클릭시 돌려줄 원본 객체
      });
    });
  }

  /* ---------- 이벤트: 포인터로 일원화 ---------- */
  _addEvents() {
    // 사이즈
    this._onResize = this._onResize.bind(this);
    window.addEventListener("resize", this._onResize, { passive: true });

    // 휠
    this._onWheel = this._onWheel.bind(this);
    this.container.addEventListener("wheel", this._onWheel, { passive: true });

    // 포인터(마우스/터치/펜)
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._endDrag = this._endDrag.bind(this);

    this.container.addEventListener("pointerdown", this._onPointerDown);
    this.container.addEventListener("pointermove", this._onPointerMove, { passive: false });
    this.container.addEventListener("pointerup", this._onPointerUp);
    this.container.addEventListener("pointercancel", this._onPointerUp);
    this.container.addEventListener("pointerleave", this._endDrag);
    window.addEventListener("blur", this._endDrag);
  }

  _onWheel(e) {
    const delta = e.deltaY || e.wheelDelta || e.detail || 0;
    this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.25;
    this._snapDebounced();
  }

  _onPointerDown(e) {
    this.isDown = true;
    this._dragPx = 0;
    this.scroll.position = this.scroll.current;
    this._startX = e.clientX ?? 0;

    // 포인터 캡처: 업이 컨테이너 밖에서 일어나도 이벤트 받음
    if (this.container.setPointerCapture) {
      try { this.container.setPointerCapture(e.pointerId); } catch {}
    }
  }

  _onPointerMove(e) {
    if (!this.isDown) return;
    const x = e.clientX ?? 0;
    const dx = x - this._startX;
    this._dragPx = Math.max(this._dragPx, Math.abs(dx));
    this.scroll.target = this.scroll.position + (-dx) * (this.scrollSpeed * 0.025);
    // 드래그 중 텍스트 선택/스크롤 방지
    if (typeof e.preventDefault === "function") e.preventDefault();
  }

  _onPointerUp(e) {
    if (this.container.releasePointerCapture) {
      try { this.container.releasePointerCapture(e.pointerId); } catch {}
    }
    this._endDrag();
  }

  _endDrag() {
    if (!this.isDown) return;
    this.isDown = false;

    // 클릭 판정: 거의 안 움직였으면 클릭으로 처리
    if (this._dragPx < 10) {
      this._fireClick();
    }
    this._snapToCard();
  }

  _fireClick() {
    if (!this.onItemClick || !this.medias || !this.medias[0]) return;
    const w = this.medias[0].width;
    const idx = Math.round(Math.abs(this.scroll.target) / w) % this.medias.length;
    const item = this.medias[idx];
    // 원본 payload가 있는 배열의 전반부 인덱스로 normalize
    const half = this.medias.length / 2;
    const baseIdx = idx % half;
    const baseItem = this.medias[baseIdx];
    const payload = baseItem?.payload || { title: baseItem?.text, cover: baseItem?.image };
    this.onItemClick(payload);
  }

  _snapToCard() {
    if (!this.medias || !this.medias[0]) return;
    const w = this.medias[0].width;
    const i = Math.round(Math.abs(this.scroll.target) / w);
    const snap = w * i;
    this.scroll.target = this.scroll.target < 0 ? -snap : snap;
  }

  _onResize() {
    this.screen = { width: this.container.clientWidth, height: this.container.clientHeight };
    this.renderer.setSize(this.screen.width, this.screen.height);

    this.camera.perspective({ aspect: this.screen.width / this.screen.height });

    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    this.viewport = { width, height };

    if (this.medias) {
      this.medias.forEach((m) => m.onResize({ screen: this.screen, viewport: this.viewport }));
    }
  }

  _update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const dir = this.scroll.current > this.scroll.last ? "right" : "left";
    if (this.medias) this.medias.forEach((m) => m.update(this.scroll, dir));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = requestAnimationFrame(this._update.bind(this));
  }

  destroy() {
    cancelAnimationFrame(this.raf);

    window.removeEventListener("resize", this._onResize);
    this.container.removeEventListener("wheel", this._onWheel);

    this.container.removeEventListener("pointerdown", this._onPointerDown);
    this.container.removeEventListener("pointermove", this._onPointerMove);
    this.container.removeEventListener("pointerup", this._onPointerUp);
    this.container.removeEventListener("pointercancel", this._onPointerUp);
    this.container.removeEventListener("pointerleave", this._endDrag);
    window.removeEventListener("blur", this._endDrag);

    if (this.renderer?.gl?.canvas?.parentNode) {
      this.renderer.gl.canvas.parentNode.removeChild(this.renderer.gl.canvas);
    }
  }
}

/* ---------- React wrapper ---------- */
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
    // 모바일에선 곡률 약화
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    const bendEff = isMobile ? Math.sign(bend) * Math.max(1, Math.abs(bend) * 0.45) : bend;

    const app = new GalleryApp(ref.current, {
      items,
      bend: bendEff,
      textColor,
      borderRadius,
      font,
      scrollSpeed,
      scrollEase,
      onItemClick
    });
    return () => app.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items), bend, textColor, borderRadius, font, scrollSpeed, scrollEase, onItemClick]);

  return <div className="circular-gallery" ref={ref} />;
}
