// src/Components/CircularGallery/CircularGallery.jsx
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import { useEffect, useRef } from "react";
import "./CircularGallery.css";

function debounce(fn, wait) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}
const lerp = (a,b,t)=>a+(b-a)*t;

function createTextTexture(gl, text, font = "bold 30px sans-serif", color = "white") {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width);
  const h = Math.ceil(parseInt(font, 10) * 1.2);
  canvas.width = w + 20; canvas.height = h + 20;
  ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = "middle"; ctx.textAlign = "center";
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillText(text, canvas.width/2, canvas.height/2);
  const texture = new Texture(gl, { generateMipmaps:false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

class Title {
  constructor({ gl, plane, text, textColor="#fff", font="bold 30px sans-serif" }) {
    this.gl = gl; this.plane = plane; this.text = text; this.textColor = textColor; this.font = font;
    const { texture, width, height } = createTextTexture(gl, text, font, textColor);
    const geometry = new Plane(gl);
    const program = new Program(gl, {
      vertex: `
        attribute vec3 position; attribute vec2 uv;
        uniform mat4 modelViewMatrix, projectionMatrix; varying vec2 vUv;
        void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragment: `
        precision highp float; uniform sampler2D tMap; varying vec2 vUv;
        void main(){ vec4 c=texture2D(tMap,vUv); if(c.a<0.1) discard; gl_FragColor=c; }`,
      uniforms: { tMap: { value: texture } },
      transparent: true
    });
    this.mesh = new Mesh(gl, { geometry, program });
    const aspect = width/height, textH = plane.scale.y * 0.15, textW = textH * aspect;
    this.mesh.scale.set(textW, textH, 1);
    this.mesh.position.y = -plane.scale.y * 0.5 - textH * 0.5 - 0.05;
    this.mesh.setParent(plane);
  }
}

class Media {
  constructor({ geometry, gl, image, index, length, scene, screen, text, viewport, bend, textColor, borderRadius=0.05, font, data, originalIndex }) {
    this.extra = 0;
    Object.assign(this, { geometry, gl, image, index, length, scene, screen, text, viewport, bend, textColor, borderRadius, font, data, originalIndex });
    this._createShader(); this._createMesh(); this._createTitle(); this.onResize({});
  }
  _createShader() {
    const texture = new Texture(this.gl, { generateMipmaps:true });
    this.program = new Program(this.gl, {
      depthTest:false, depthWrite:false,
      vertex: `
        precision highp float; attribute vec3 position; attribute vec2 uv;
        uniform mat4 modelViewMatrix, projectionMatrix; uniform float uTime, uSpeed;
        varying vec2 vUv;
        void main(){ vUv=uv; vec3 p=position;
          p.z=(sin(p.x*4.0+uTime)*1.5+cos(p.y*2.0+uTime)*1.5)*(0.1+uSpeed*0.5);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
      fragment: `
        precision highp float; uniform vec2 uImageSizes,uPlaneSizes; uniform sampler2D tMap; uniform float uBorderRadius; varying vec2 vUv;
        float roundedBoxSDF(vec2 p, vec2 b, float r){ vec2 d=abs(p)-b; return length(max(d,vec2(0.0)))+min(max(d.x,d.y),0.0)-r; }
        void main(){
          vec2 ratio=vec2(
            min((uPlaneSizes.x/uPlaneSizes.y)/(uImageSizes.x/uImageSizes.y),1.0),
            min((uPlaneSizes.y/uPlaneSizes.x)/(uImageSizes.y/uImageSizes.x),1.0)
          );
          vec2 uv=vec2(vUv.x*ratio.x+(1.0-ratio.x)*0.5, vUv.y*ratio.y+(1.0-ratio.y)*0.5);
          vec4 color=texture2D(tMap,uv);
          float d=roundedBoxSDF(vUv-0.5, vec2(0.5-uBorderRadius), uBorderRadius);
          float alpha=1.0 - smoothstep(-0.002, 0.002, d);
          gl_FragColor=vec4(color.rgb, alpha);
        }`,
      uniforms: {
        tMap:{ value: texture }, uPlaneSizes:{ value:[0,0] }, uImageSizes:{ value:[0,0] },
        uSpeed:{ value:0 }, uTime:{ value:100*Math.random() }, uBorderRadius:{ value:this.borderRadius }
      },
      transparent:true
    });
    const img = new Image(); img.crossOrigin="anonymous"; img.src=this.image;
    img.onload = ()=>{ texture.image=img; this.program.uniforms.uImageSizes.value=[img.naturalWidth,img.naturalHeight]; };
  }
  _createMesh(){ this.plane = new Mesh(this.gl, { geometry:this.geometry, program:this.program }); this.plane.setParent(this.scene); }
  _createTitle(){ this.title = new Title({ gl:this.gl, plane:this.plane, text:this.text, textColor:this.textColor, font:this.font }); }
  update(scroll, dir){
    this.plane.position.x = this.x - scroll.current - this.extra;
    const x=this.plane.position.x, H=this.viewport.width/2, B=Math.abs(this.bend);
    if(B===0){ this.plane.position.y=0; this.plane.rotation.z=0; }
    else {
      const R=(H*H+B*B)/(2*B), ex=Math.min(Math.abs(x),H);
      const arc = R - Math.sqrt(R*R - ex*ex);
      if(this.bend>0){ this.plane.position.y=-arc; this.plane.rotation.z = -Math.sign(x)*Math.asin(ex/R); }
      else{ this.plane.position.y=arc; this.plane.rotation.z = Math.sign(x)*Math.asin(ex/R); }
    }
    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;

    const halfW=this.plane.scale.x/2, vpHalf=this.viewport.width/2;
    this.isBefore = this.plane.position.x + halfW < -vpHalf;
    this.isAfter  = this.plane.position.x - halfW >  vpHalf;
    if(dir==="right" && this.isBefore){ this.extra -= this.widthTotal; this.isBefore=this.isAfter=false; }
    if(dir==="left"  && this.isAfter ){ this.extra += this.widthTotal; this.isBefore=this.isAfter=false; }
  }
  onResize({ screen, viewport }={}){
    if(screen) this.screen=screen; if(viewport) this.viewport=viewport;
    this.scale = this.screen.height/1500;
    this.plane.scale.y = (this.viewport.height*(900*this.scale))/this.screen.height;
    this.plane.scale.x = (this.viewport.width *(700*this.scale))/this.screen.width;
    this.plane.program.uniforms.uPlaneSizes.value=[this.plane.scale.x, this.plane.scale.y];
    this.padding=1; this.width=this.plane.scale.x+this.padding; this.widthTotal=this.width*this.length; this.x=this.width*this.index;
  }
}

class OglCarousel {
  constructor(container, { items, bend, textColor="#fff", borderRadius=0.05, font="bold 30px sans-serif", scrollSpeed=2, scrollEase=0.05, onItemClick=null } = {}) {
    this.container=container; this.scrollSpeed=scrollSpeed; this.scroll={ ease:scrollEase, current:0, target:0, last:0 };
    this.onItemClick=onItemClick; this.onCheckDebounce = debounce(this.onCheck.bind(this), 200);
    this._createRenderer(); this._createCamera(); this._createScene(); this.onResize(); this._createGeometry(); this._createMedias(items, bend, textColor, borderRadius, font);
    this._bindInput(); this._loop();
  }
  _createRenderer(){
    this.renderer=new Renderer({ alpha:true, antialias:true, dpr:Math.min(window.devicePixelRatio||1,2) });
    this.gl=this.renderer.gl; this.gl.clearColor(0,0,0,0); this.container.appendChild(this.gl.canvas);
  }
  _createCamera(){ this.camera=new Camera(this.gl); this.camera.fov=45; this.camera.position.z=20; }
  _createScene(){ this.scene=new Transform(); }
  _createGeometry(){ this.planeGeometry=new Plane(this.gl,{ heightSegments:50, widthSegments:100 }); }
  _createMedias(items, bend=1, textColor, borderRadius, font){
    const defaults=[{image:`https://picsum.photos/seed/1/800/600?grayscale`,text:"Bridge"},{image:`https://picsum.photos/seed/2/800/600?grayscale`,text:"Desk Setup"},{image:`https://picsum.photos/seed/3/800/600?grayscale`,text:"Waterfall"},{image:`httpsum.photos/seed/4/800/600?grayscale`,text:"Strawberries"}];
    this.items = items && items.length ? items : defaults;
    this.originalLength = this.items.length;
    this.mediasImages = this.items.concat(this.items);
    this.medias = this.mediasImages.map((data, index)=> new Media({
      geometry:this.planeGeometry, gl:this.gl, image:data.image, index, length:this.mediasImages.length,
      scene:this.scene, screen:this.screen, text:data.text, viewport:this.viewport, bend, textColor, borderRadius, font,
      data, originalIndex:index % this.originalLength
    }));
  }
  // ---- 입력 처리 (클릭 판정은 mouse/touch up에서만) ----
  _onDown = (e) => {
    this.isDown = true; this.dragged=false;
    this.scroll.position = this.scroll.current;
    const p = e.touches ? e.touches[0] : e;
    this.startX = p.clientX; this.startY = p.clientY; this.startTime = Date.now();
  }
  _onMove = (e) => {
    if(!this.isDown) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - this.startX, dy = p.clientY - this.startY;
    if(Math.hypot(dx,dy) > 6) this.dragged = true; // 이동량 임계값
    const distance = (this.startX - p.clientX) * (this.scrollSpeed * 0.025);
    this.scroll.target = this.scroll.position + distance;
  }
  _onUp = () => {
    if(!this.isDown) return;
    this.isDown = false;
    const dt = Date.now() - this.startTime;
    if(!this.dragged && dt < 250){ // 탭/클릭
      this._handleClick();
    } else {
      this.onCheck();
    }
  }
  _onWheel = (e) => {
    const delta = e.deltaY || e.wheelDelta || e.detail;
    this.scroll.target += (delta>0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    this.onCheckDebounce();
  }
  _handleClick(){
    if(!this.onItemClick || !this.medias || !this.medias[0]) return;
    const width = this.medias[0].width;
    const i = Math.round(Math.abs(this.scroll.target) / width) % this.originalLength;
    const data = this.items[i];
    this.onItemClick(data.payload ?? data);
  }
  onCheck(){
    if(!this.medias || !this.medias[0]) return;
    const width = this.medias[0].width;
    const idx = Math.round(Math.abs(this.scroll.target)/width);
    const snap = width*idx;
    this.scroll.target = this.scroll.target < 0 ? -snap : snap;
  }
  onResize(){
    this.screen={ width:this.container.clientWidth, height:this.container.clientHeight };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect:this.screen.width/this.screen.height });
    const fov=(this.camera.fov*Math.PI)/180, h=2*Math.tan(fov/2)*this.camera.position.z, w=h*this.camera.aspect;
    this.viewport={ width:w, height:h };
    if(this.medias) this.medias.forEach(m=>m.onResize({ screen:this.screen, viewport:this.viewport }));
  }
  _loop(){
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const dir = this.scroll.current > this.scroll.last ? "right" : "left";
    if(this.medias) this.medias.forEach(m=>m.update(this.scroll, dir));
    this.renderer.render({ scene:this.scene, camera:this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = requestAnimationFrame(()=>this._loop());
  }
  _bindInput(){
    window.addEventListener("resize", this.onResize.bind(this), { passive:true });
    // 컨테이너 내부에만 바인딩 → 드래그 후 클릭 오인 줄임, click 리스너 없음
    this.container.addEventListener("wheel", this._onWheel, { passive:true });
    this.container.addEventListener("mousedown", this._onDown);
    this.container.addEventListener("mousemove", this._onMove);
    this.container.addEventListener("mouseup", this._onUp);
    this.container.addEventListener("mouseleave", this._onUp);
    this.container.addEventListener("touchstart", this._onDown, { passive:true });
    this.container.addEventListener("touchmove", this._onMove, { passive:true });
    this.container.addEventListener("touchend", this._onUp);
    // CSS로 수직 스크롤 허용
    this.container.style.touchAction = "pan-y";
  }
  destroy(){
    cancelAnimationFrame(this.raf);
    this.container.removeEventListener("wheel", this._onWheel);
    this.container.removeEventListener("mousedown", this._onDown);
    this.container.removeEventListener("mousemove", this._onMove);
    this.container.removeEventListener("mouseup", this._onUp);
    this.container.removeEventListener("mouseleave", this._onUp);
    this.container.removeEventListener("touchstart", this._onDown);
    this.container.removeEventListener("touchmove", this._onMove);
    this.container.removeEventListener("touchend", this._onUp);
    if(this.renderer?.gl?.canvas?.parentNode){ this.renderer.gl.canvas.parentNode.removeChild(this.renderer.gl.canvas); }
  }
}

export default function CircularGallery({
  items, bend=3, textColor="#ffffff", borderRadius=0.05, font="bold 30px sans-serif",
  scrollSpeed=2, scrollEase=0.05, onItemClick
}) {
  const ref = useRef(null);
  useEffect(()=>{
    const app = new OglCarousel(ref.current, { items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase, onItemClick });
    return ()=>app.destroy();
  }, [items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase, onItemClick]);
  return <div className="circular-gallery" ref={ref} />;
}
