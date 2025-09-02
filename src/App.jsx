import React, { useEffect, useMemo, useState, useEffect as useEffectAlias } from "react";
import BallPit from "./Backgrounds/Ballpit/Ballpit";
import ProfileCard from "./Components/ProfileCard/ProfileCard";
import "./Components/ProfileCard/ProfileCard.css";

import person from "./assets/person.png";
import iconpattern from "./assets/iconpattern.png";
import grain from "./assets/grain.webp";

// ========= iOS 자이로/모션 권한 요청 (사용자 제스처 안에서 호출 필요) =========
let _motionAsked = false;
async function requestMotionPermission() {
  if (_motionAsked) return;
  _motionAsked = true;

  // DeviceOrientation (방향)
  try {
    const DO = window.DeviceOrientationEvent;
    if (DO && typeof DO.requestPermission === "function") {
      const s = await DO.requestPermission(); // 'granted' | 'denied' | 'prompt'
      console.log("DeviceOrientation permission:", s);
    }
  } catch (e) {}

  // DeviceMotion (가속도/자이로)
  try {
    const DM = window.DeviceMotionEvent;
    if (DM && typeof DM.requestPermission === "function") {
      const s = await DM.requestPermission();
      console.log("DeviceMotion permission:", s);
    }
  } catch (e) {}
}

// ========= 유틸 =========
const cx = (...classes) => classes.filter(Boolean).join(" ");
const glass =
  "backdrop-blur-xl bg-white/5 dark:bg-black/20 border border-white/10 shadow-[0_0_1px_#fff_inset,0_10px_40px_-10px_rgba(0,0,0,0.5)]";
const brand = {
  chip: "bg-white/10 text-white/80 border border-white/15 hover:bg-white/15",
};

// BASE_URL을 사용해 정적 자산 경로 자동 보정
const resolveAsset = (p) => {
  if (!p) return p;
  if (/^https?:\/\//i.test(p)) return p;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${base}/${p.replace(/^\//, "")}`;
};

// ========= “커질 때만 확장” 뷰포트 천장 훅 =========
function useViewportCeil() {
  useEffect(() => {
    let maxH = 0;
    const measure = () =>
      Math.round(window.visualViewport?.height || window.innerHeight);
    const apply = (h) =>
      document.documentElement.style.setProperty("--vh-ceil", `${h}px`);

    const updateUpOnly = () => {
      const h = measure();
      if (h > maxH) {
        maxH = h;
        apply(maxH);
      }
    };

    updateUpOnly();
    setTimeout(updateUpOnly, 300);

    const onResize = () => updateUpOnly();
    window.addEventListener("resize", onResize, { passive: true });

    const onOrient = () => {
      maxH = 0;
      setTimeout(updateUpOnly, 400);
    };
    window.addEventListener("orientationchange", onOrient);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrient);
    };
  }, []);
}

// ========= 샘플 데이터 =========
const SAMPLE_PROJECTS = [
  {
    id: "2025-09-aurora",
    title: "Aurora Shell – Media Facade",
    year: 2025,
    client: "City Art Center",
    tags: ["Projection", "Interactive"],
    summary: "9채널 프로젝션과 라이다 기반 인터랙션.",
    cover: "images/aurora/cover.jpg",
    images: ["images/aurora/1.jpg", "images/aurora/2.jpg"],
    description:
      "현대적 입면 위를 흐르는 오로라 테마의 인터랙티브 모션 그래픽.",
  },
  {
    id: "2025-06-flame",
    title: "Digital Flame",
    year: 2025,
    client: "Youth Winter Games",
    tags: ["Anamorphic", "Realtime"],
    summary: "대형 LED 파사드용 아나모픽 디지털 성화.",
    cover:
      "https://images.unsplash.com/photo-1496302662116-85c20534e7b1?q=80&w=1600&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1495567720989-cebdbdd97913?q=80&w=1600&auto=format&fit=crop",
    ],
    description:
      "날씨 데이터와 연동되어 시간대별로 다른 화염 볼륨감을 연출했습니다.",
  },
  {
    id: "2024-12-pulse",
    title: "Pulse Field",
    year: 2024,
    client: "City Festival",
    tags: ["Projection", "Sound", "Interactive"],
    summary: "음향 분석 기반 실시간 파동 시각화.",
    cover:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1600&auto=format&fit=crop",
    images: [
      "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1516542076529-1ea3854896e1?q=80&w=1600&auto=format&fit=crop",
    ],
    description:
      "관객의 목소리와 발소리에 반응하는 프로젝션 필드로, 야외 축제의 핵심 포토 스팟을 만들었습니다.",
  },
];

// ========= 공용 컴포넌트 =========
function Section({ id, className = "", children }) {
  return (
    <section id={id} className={cx("relative z-10 py-20 md:py-28", className)}>
      <div className="mx-auto w-full max-w-7xl px-5 md:px-8">{children}</div>
    </section>
  );
}
function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}
function Button({ as: Tag = "button", className = "", children, ...props }) {
  return (
    <Tag
      className={cx(
        "inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-medium text-white",
        "border border-white/15 bg-white/10 hover:bg-white/15 active:translate-y-px transition",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={cx(
            "max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl",
            glass
          )}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="text-base font-semibold text-white">Project</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-white/10"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="max-h-[78vh] overflow-y-auto p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
function ProjectCard({ item, onOpen }) {
  return (
    <button
      onClick={() => onOpen(item)}
      className={cx(
        "group relative block overflow-hidden rounded-3xl",
        "ring-1 ring-white/10 hover:ring-white/30 transition"
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <img
          src={resolveAsset(item.cover)}
          alt={item.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/0" />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
        <div className="text-left">
          <h4 className="text-lg font-semibold text-white drop-shadow">
            {item.title}
          </h4>
          <p className="text-xs text-white/70">
            {item.client} · {item.year}
          </p>
        </div>
        <div className="flex gap-2 opacity-0 transition group-hover:opacity-100">
          {item.tags?.slice(0, 2).map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      </div>
    </button>
  );
}
function ProjectGallery({ item }) {
  return (
    <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        {item.images?.map((src, i) => (
          <img
            key={i}
            src={resolveAsset(src)}
            alt={`${item.title} ${i + 1}`}
            className="w-full rounded-2xl border border-white/10 object-cover"
          />
        ))}
      </div>
      <div className="space-y-4">
        <div className={cx("rounded-2xl p-5", glass)}>
          <h3 className="text-2xl font-semibold text-white">{item.title}</h3>
          <p className="mt-1 text-sm text-white/70">
            {item.client} · {item.year}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.tags?.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
          <p className="prose prose-invert mt-4 max-w-none text-white/80">
            {item.description}
          </p>
        </div>
        {item.summary && (
          <div className={cx("rounded-2xl p-5", glass)}>
            <h4 className="font-semibold text-white">Summary</h4>
            <p className="mt-2 text-white/80">{item.summary}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ========= 메인 =========
export default function App() {
  useViewportCeil(); // 스크림이 "커질 때만 확장"되도록

  const [menuOpen, setMenuOpen] = useState(false);
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [active, setActive] = useState(null);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("All");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}projects.json`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data)) setProjects(data);
      })
      .catch(() => {});
  }, []);

  const tags = useMemo(() => {
    const t = new Set(["All"]);
    projects.forEach((p) => p.tags?.forEach((x) => t.add(x)));
    return Array.from(t);
  }, [projects]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const okTag = tag === "All" || p.tags?.includes(tag);
      const q = query.trim().toLowerCase();
      const okQ =
        !q ||
        [p.title, p.client, p.summary, p.description, ...(p.tags || [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      return okTag && okQ;
    });
  }, [projects, tag, query]);

  return (
    <div className="relative min-h-screen bg-[#0b0e13] [color-scheme:dark]">
      {/* ▼ 배경 (Ballpit) */}
      <div className="fixed inset-0 z-0 vh-safe">
        <BallPit
          className="pointer-events-auto"
          count={200}
          gravity={0.02}
          friction={0.9975}
          wallBounce={0.95}
          followCursor
          // lockPixelRatio
          colors={[0xff3864, 0xffbd2e, 0x7cff6b, 0x3ae7ff, 0x7a5cff, 0xff6ad5]}
          materialParams={{
            metalness: 0.40,
            roughness: 0.42,
            clearcoat: 0.9,
            clearcoatRoughness: 0.18,
          }}
          ambientIntensity={0.3}
          lightIntensity={80}
        />
      </div>

      {/* ▼ 스크림/비네트 — 빈칸 방지용 커버 */}
      <div className="fixed inset-x-0 top-0 z-0 pointer-events-none vh-cover scrim-safe">
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/35" />
        <div className="absolute left-0 top-0 h-[55vh] w-[70vw] md:w-[50vw] -translate-x-[5%] -translate-y-[5%] rounded-[50%] blur-2xl bg-black/30" />
      </div>

      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 md:px-8">
          <a href="#" className="text-lg font-semibold tracking-tight text-white">
            TheRenderStudio
          </a>
          <nav className="hidden gap-6 md:flex">
            <a href="#projects" className="text-sm text-white/80 hover:text-white">
              Projects
            </a>
            <a href="#services" className="text-sm text-white/80 hover:text-white">
              Services
            </a>
            <a href="#about" className="text-sm text-white/80 hover:text-white">
              About
            </a>
            <a href="#contact" className="text-sm text-white/80 hover:text-white">
              Contact
            </a>
          </nav>
          <div className="md:hidden">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-xl border border-white/15 bg-white/10 p-2"
            >
              ☰
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-white/10 bg-black/40 px-5 py-3 md:hidden">
            <div className="flex flex-col gap-3">
              {[
                ["Projects", "#projects"],
                ["Services", "#services"],
                ["About", "#about"],
                ["Contact", "#contact"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="text-white/90"
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <Section id="hero" className="pt-16">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 p-8 md:p-14">
          {/* 국소 비네트 */}
          <div className="pointer-events-none absolute -inset-6 md:-inset-10 rounded-[2rem] bg-[radial-gradient(60%_50%_at_22%_28%,rgba(0,0,0,0.55),transparent_60%)]" />

          <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
            {/* 왼쪽: 타이틀/설명/버튼 */}
            <div>
              <h1
                className="max-w-2xl text-4xl font-bold leading-tight text-white md:text-6xl"
                style={{ textShadow: "0 2px 14px rgba(0,0,0,.85), 0 6px 32px rgba(0,0,0,.55)" }}
              >
                Creative Media for <span className="text-white">Exhibitions</span>
              </h1>

              <p
                className="mt-4 max-w-2xl text-base text-white/90 md:text-lg"
                style={{ textShadow: "0 1px 10px rgba(0,0,0,.75)" }}
              >
                TheRenderStudio는 미디어아트·VFX·인터랙티브를 제작하는 소규모 팀입니다.
                빠른 프로토타이핑과 깔끔한 마감으로 브랜드/전시 경험을 만듭니다.
              </p>

              <div className="mt-6 flex gap-3">
                <a
                  href="#projects"
                  className="inline-block rounded-2xl px-5 py-2.5 text-sm font-medium text-white border border-white/15 bg-white/10 hover:bg-white/15"
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}
                >
                  View Projects
                </a>
                <a
                  href="#contact"
                  className="inline-block rounded-2xl px-5 py-2.5 text-sm font-medium text-white border border-white/15 bg-white/20 hover:bg-white/25"
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}
                >
                  Get in touch
                </a>
              </div>
            </div>

            {/* 오른쪽: ProfileCard (모바일 틸트 ON) */}
            <div
              className="mt-6 w-full md:mt-0 md:w-[420px] tilt-wrap"
              onClick={requestMotionPermission}       // iOS 권한 팝업 (탭 시)
              onTouchStart={requestMotionPermission}  // iOS 사파리: 터치 시작에도 요청
            >
              <ProfileCard
                // 핵심 옵션
                enableTilt={true}
                enableMobileTilt={true}
                mobileTiltSensitivity={5}

                // 비주얼(원하면 바꿔도 됨)
                name="TheRenderStudio"
                title="Media Art & Interactive"
                handle="therenderstudio"
                status="Online"
                contactText="Contact"
                //avatarUrl="/assets/person.png"
                //miniAvatarUrl="/assets/person.png"
                //iconUrl="/assets/iconpattern.png"
                //grainUrl="/assets/grain.webp"
                miniAvatarUrl={person}
                avatarUrl={person}
                iconUrl={iconpattern}
                grainUrl={grain}

                

                // 배경 그라데이션(샘플)
                showBehindGradient={true}
                behindGradient="radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(266,100%,90%,var(--card-opacity)) 4%,hsla(266,50%,80%,calc(var(--card-opacity)*0.75)) 10%,hsla(266,25%,70%,calc(var(--card-opacity)*0.5)) 50%,hsla(266,0%,60%,0) 100%),radial-gradient(35% 52% at 55% 20%,#00ffaac4 0%,#073aff00 100%),radial-gradient(100% 100% at 50% 50%,#00c1ffff 1%,#073aff00 76%),conic-gradient(from 124deg at 50% 50%,#c137ffff 0%,#07c6ffff 40%,#07c6ffff 60%,#c137ffff 100%)"
                innerGradient="linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)"

                // 필요시 추가 클래스
                className="select-none will-change-transform"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* SERVICES */}
      <Section id="services" className="py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { t: "Creative Direction", d: "콘셉트 개발, 아트 디렉션, 프로토타이핑" },
            { t: "Realtime Graphics", d: "Unreal/Unity/TouchDesigner 기반 실시간 파이프라인" },
            { t: "Exhibition Engineering", d: "프로젝션/LED, 동기화, 센서·서버 연동" },
          ].map((s) => (
            <div key={s.t} className={cx("rounded-3xl p-6", glass)}>
              <h3 className="text-xl font-semibold text-white">{s.t}</h3>
              <p className="mt-2 text-white/75">{s.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ABOUT + REEL */}
      <Section id="about" className="py-16">
        <div className="grid items-start gap-8 md:grid-cols-2">
          <div className={cx("rounded-3xl p-6", glass)}>
            <h2 className="text-2xl font-semibold text-white">About</h2>
            <p className="mt-3 text-white/85">
              TheRenderStudio는 미디어아트와 인터랙티브 콘텐츠를 만드는 스튜디오입니다.
              공간·스크린·관객의 참여를 연결해 브랜드와 전시의 이야기를 설계합니다.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/70">
              <p>Founded — 2019</p>
              <p>Seoul, KR</p>
              <p>Team — Small</p>
              <p>Partners — Museums · Agencies · Brands</p>
            </div>
          </div>
          <div className={cx("overflow-hidden rounded-3xl", glass)}>
            <div className="aspect-video w-full bg-black/40">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0"
                title="Showreel"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-white/70">Showreel</span>
              <Button as="a" href="#contact">Project Inquiry</Button>
            </div>
          </div>
        </div>
      </Section>

      {/* CONTACT */}
      <Section id="contact" className="py-16">
        <div className={cx("rounded-3xl p-8 text-center", glass)}>
          <h2
            className="text-3xl font-bold text-white"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,.75)" }}
          >
            Let’s build something luminous.
          </h2>
          <p
            className="mx-auto mt-3 max-w-2xl text-white/85"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,.55)" }}
          >
            프로젝트 문의를 환영합니다. 간단한 아이디어도 괜찮아요—스케줄/예산에 맞춰 제안서를 드립니다.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button as="a" href="mailto:hello@therenderstudio.com">
              hello@therenderstudio.com
            </Button>
            <Button
              as="a"
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
              className="bg-white/20 hover:bg-white/25"
            >
              Instagram
            </Button>
            <Button
              as="a"
              href="https://vimeo.com/"
              target="_blank"
              rel="noreferrer"
              className="bg-white/20 hover:bg-white/25"
            >
              Vimeo
            </Button>
          </div>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-5 text-sm text-white/60 md:flex-row md:px-8">
          <p>© {new Date().getFullYear()} TheRenderStudio — Media Art & Interactive</p>
          <div className="flex items-center gap-4">
            <a href="#projects" className="hover:text-white">Projects</a>
            <a href="#services" className="hover:text-white">Services</a>
            <a href="#about" className="hover:text-white">About</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>

      {/* PROJECT MODAL */}
      <Modal open={!!active} onClose={() => setActive(null)}>
        {active && <ProjectGallery item={active} />}
      </Modal>
    </div>
  );
}
