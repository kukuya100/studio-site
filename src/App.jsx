import React, { useEffect, useMemo, useState } from "react";
import BallPit from "./Backgrounds/Ballpit/Ballpit";

/* ========= Utils ========= */
const cx = (...classes) => classes.filter(Boolean).join(" ");
const glass =
  "backdrop-blur-xl bg-white/5 dark:bg-black/20 border border-white/10 shadow-[0_0_1px_#fff_inset,0_10px_40px_-10px_rgba(0,0,0,0.5)]";

const resolveAsset = (p) => {
  if (!p) return p;
  if (/^https?:\/\//i.test(p)) return p;
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${base}/${p.replace(/^\//, "")}`;
};

/* ========= Viewport ceil ========= */
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

/* ========= i18n (KR는 Services만 한국어, 나머지는 영어 유지) ========= */
const I18N = {
  en: {
    navProjects: "Projects",
    navContact: "Contact",
    heroTitle: "Where Visual Creativity Meets Technology",
    heroSubtitle:
      "A creative studio shaping immersive visual experiences with innovation.",
    btnViewProjects: "View Projects",
    btnContact: "Contact",
    portfolioTitle: "Portfolio",
    portfolioDesc: "Click a tile to open the project page.",
    searchPlaceholder: "Search…",
    tagAll: "All",
    vimeoLink: "Vimeo ↗",
    // Services (EN)
    servicesTitle1: "Creative Direction",
    servicesDesc1:
      "We expand ideas into experiences — from concept planning to art direction and prototyping, crafting narratives for brands and spaces.",
    servicesTitle2: "Brand Experiences",
    servicesDesc2:
      "We visualize brand identity sensibly — from advertising & brand films to interactive showcases, turning messages into artistic experiences.",
    servicesTitle3: "Media Art & Production",
    servicesDesc3:
      "We combine high-end media art with real-time pipelines to deliver large-scale projection, LED, and sensor/server integrated works.",
    // Rest of UI stays English even for ko
    aboutTitle: "About",
    aboutP1:
      "TheRenderStudio creates media art and interactive content—bridging spaces, screens, and participation to craft stories for brands and exhibitions.",
    founded: "Founded — 2019",
    location: "Seoul, KR",
    team: "Team — Small",
    partners: "Partners — Museums · Agencies · Brands",
    showreel: "Showreel",
    projectInquiry: "Project Inquiry",
    contactTitle: "Let’s build something luminous.",
    contactSubtitle:
      "We welcome project proposals. From early ideas to concrete plans, we deliver tailored solutions optimized to your schedule and budget.",
    footerProjects: "Projects",
    footerContact: "Contact",
    more: "More",
  },
  ko: {
    // 모든 기본 UI 문구는 영어 그대로 유지
    navProjects: "Projects",
    navContact: "Contact",
    heroTitle: "Where Visual Creativity Meets Technology",
    heroSubtitle:
      "A creative studio shaping immersive visual experiences with innovation.",
    btnViewProjects: "View Projects",
    btnContact: "Contact",
    portfolioTitle: "Portfolio",
    portfolioDesc: "Click a tile to open the project page.",
    searchPlaceholder: "Search…",
    tagAll: "All",
    vimeoLink: "Vimeo ↗",
    // Services만 한국어
    servicesTitle1: "크리에이티브 디렉션",
    servicesDesc1:
      "아이디어를 경험으로 확장합니다 — 콘셉트 기획부터 아트 디렉션, 프로토타이핑까지, 브랜드와 공간의 서사를 설계합니다.",
    servicesTitle2: "브랜드 익스피리언스",
    servicesDesc2:
      "광고·브랜드 필름부터 인터랙티브 쇼케이스까지 브랜드 아이덴티티를 감각적으로 시각화하여 메시지를 예술적 경험으로 전환합니다.",
    servicesTitle3: "미디어 아트 & 프로덕션",
    servicesDesc3:
      "하이엔드 미디어아트와 실시간 파이프라인을 결합해 대규모 프로젝션, LED, 센서/서버 연동 작업을 구현합니다.",
    // 나머지 UI도 영어
    aboutTitle: "About",
    aboutP1:
      "TheRenderStudio creates media art and interactive content—bridging spaces, screens, and participation to craft stories for brands and exhibitions.",
    founded: "Founded — 2019",
    location: "Seoul, KR",
    team: "Team — Small",
    partners: "Partners — Museums · Agencies · Brands",
    showreel: "Showreel",
    projectInquiry: "Project Inquiry",
    contactTitle: "Let’s build something luminous.",
    contactSubtitle:
      "We welcome project proposals. From early ideas to concrete plans, we deliver tailored solutions optimized to your schedule and budget.",
    footerProjects: "Projects",
    footerContact: "Contact",
    more: "More",
  },
};

const SERVICES = (t) => [
  { t: t.servicesTitle1, d: t.servicesDesc1 },
  { t: t.servicesTitle2, d: t.servicesDesc2 },
  { t: t.servicesTitle3, d: t.servicesDesc3 },
];

/* ========= Sample projects (local fallback) ========= */
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
    // vimeo: "https://vimeo.com/showcase/11634672?video=1044260115",
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

/* ========= Common components ========= */
function Section({ id, className = "", children }) {
  return (
    <section id={id} className={cx("relative z-10", className)}>
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
        <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl backdrop-blur-xl bg-white/5 dark:bg-black/20 border border-white/10 shadow-[0_0_1px_#fff_inset,0_10px_40px_-10px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="text-base font-semibold text-white">Project</h3>
            <button
              onClick={onClose}
              className="group inline-flex h-10 w-10 items-center justify-center rounded-lg
                         text-white/85 hover:text-white hover:bg-white/15
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70
                         active:scale-95 transition"
              aria-label="Close"
              title="Close"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" className="block" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="max-h-[78vh] overflow-y-auto p-4">{children}</div>
        </div>
      </div>
    </div>
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
          <p className="prose prose-invert mt-4 max-w-none text-white/80">{item.description}</p>
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

/* ========= Portfolio (teamLab-like tiles) ========= */
function getVimeoId(u) {
  try {
    if (!u) return "";
    const url = new URL(u);
    const qid = url.searchParams.get("video");
    if (qid) return qid; // showcase?video=123
    const parts = url.pathname.split("/").filter(Boolean);
    const tail = parts.pop();
    return /^\d+$/.test(tail) ? tail : "";
  } catch {
    return /^\d+$/.test(u) ? u : "";
  }
}
const asVimeoPage = (urlOrId) => {
  if (!urlOrId) return undefined;
  if (/^https?:\/\//i.test(urlOrId)) {
    const id = getVimeoId(urlOrId);
    return id ? `https://vimeo.com/${id}` : urlOrId;
  }
  return `https://vimeo.com/${urlOrId}`;
};
const guessAspect = (item) => {
  if (!item) return "16/9";
  if (item.ratio === "9/16" || item.aspect === "9:16" || item.vertical) return "9/16";
  return "16/9";
};

function useInViewport(rootMargin = "300px") {
  const [inView, setInView] = useState(false);
  const ref = React.useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setInView(true)),
      { root: null, rootMargin, threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return { ref, inView };
}

function PortfolioTile({ item, onFallbackClick, t }) {
  const hrefCandidate =
    item.href || item.link || item.vimeo || item.url || item.video;
  const vimeoId = getVimeoId(hrefCandidate);
  const href = asVimeoPage(hrefCandidate);
  const ratioClass = guessAspect(item) === "9/16" ? "aspect-[9/16]" : "aspect-video";
  const { ref, inView } = useInViewport("300px");
  const poster = resolveAsset(item.poster || item.cover);

  const frameSrc =
    inView && vimeoId
      ? `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0&controls=0&autopause=1&dnt=1&transparent=0`
      : undefined;

  const CardInner = (
    <>
      <div ref={ref} className={cx("relative w-full overflow-hidden bg-black", ratioClass)}>

        {vimeoId ? (
          <iframe
            className="absolute inset-0 h-full w-full pointer-events-none"
            src={frameSrc}
            style={{ backgroundColor: '#000' }}   // 안전망
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
            loading="lazy"
            title={item.title || "Vimeo"}
          />
        ) : poster ? (
          <img
            src={poster}
            alt={item.title || "project"}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/60">
            View ↗
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/25" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-3">
        <span className="truncate text-sm font-medium text-white drop-shadow">
          {item.title || "Untitled"}
        </span>
        <span className="text-xs text-white/85">{href ? t.vimeoLink : "Details"}</span>
      </div>
    </>
  );

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={item.title}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/30"
    >
      {CardInner}
    </a>
  ) : (
    <button
      type="button"
      onClick={() => onFallbackClick?.(item)}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/30"
      title={item.title}
    >
      {CardInner}
    </button>
  );
}

function PortfolioGrid({ items, onFallbackClick, t }) {
  if (!items?.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it, i) => (
        <PortfolioTile key={it.id || i} item={it} onFallbackClick={onFallbackClick} t={t} />
      ))}
    </div>
  );
}

/* ========= App ========= */
export default function App() {
  useViewportCeil();

  const [menuOpen, setMenuOpen] = useState(false);
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [active, setActive] = useState(null);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("All");

  // i18n state: default EN; persist
  const [lang, setLang] = useState("en");
  const t = I18N[lang];

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved === "en" || saved === "ko") setLang(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  // pagination (6/page)
  const PAGE = 9;
  const [visibleCount, setVisibleCount] = useState(PAGE);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}projects.json?ts=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data)) setProjects(data);
      })
      .catch(() => {});
  }, []);

  const tags = useMemo(() => {
    const s = new Set(["All"]);
    projects.forEach((p) => p.tags?.forEach((x) => s.add(x)));
    return Array.from(s);
  }, [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      const okTag = tag === "All" || p.tags?.includes(tag);
      const hay = [
        p.title,
        p.client,
        p.summary,
        p.description,
        p.href,
        p.link,
        p.vimeo,
        p.url,
        p.video,
        ...(p.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const okQ = !q || hay.includes(q);
      return okTag && okQ;
    });
  }, [projects, tag, query]);

  useEffect(() => {
    setVisibleCount(PAGE);
  }, [query, tag, projects]);

  const paged = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const handleLoadMore = () => setVisibleCount((c) => Math.min(c + PAGE, filtered.length));

  return (
    <div className="relative min-h-screen bg-[#0b0e13] [color-scheme:dark]">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <BallPit
          className="pointer-events-auto"
          count={200}
          gravity={0.02}
          friction={0.9975}
          wallBounce={0.95}
          followCursor
          colors={[0xff3864, 0xffbd2e, 0x7cff6b, 0x3ae7ff, 0x7a5cff, 0xff6ad5]}
          materialParams={{
            metalness: 0.4,
            roughness: 0.42,
            clearcoat: 0.9,
            clearcoatRoughness: 0.18,
          }}
          ambientIntensity={0.3}
          lightIntensity={80}
          logoUrl={`${import.meta.env.BASE_URL}images/logo.png`}
        />
      </div>

      {/* Vignette */}
      <div className="fixed inset-x-0 top-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/35" />
        <div className="absolute left-0 top-0 h-[55vh] w-[70vw] md:w-[50vw] -translate-x-[5%] -translate-y-[5%] rounded-[50%] blur-2xl bg-black/30" />
      </div>

      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 md:px-8">
              <a href="#" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
      <img
        src={resolveAsset("icons/rndr_logo_white.png")}
        alt="TheRenderStudio logo"
        className="h-7 w-7 block"
        loading="lazy"
        decoding="async"
      />
      <span>The Render Studio</span>
    </a>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#projects" className="text-sm text-white/80 hover:text-white">
              {t.navProjects}
            </a>
            <a href="#contact" className="text-sm text-white/80 hover:text-white">
              {t.navContact}
            </a>

            {/* Lang switch */}
            <div className="ml-4 flex items-center gap-2">
              <button
                onClick={() => setLang("en")}
                className={cx(
                  "rounded-md px-2 py-1 text-xs",
                  lang === "en" ? "bg-white text-black" : "text-white/80 hover:text-white"
                )}
                aria-pressed={lang === "en"}
              >
                EN
              </button>
              <span className="text-white/40">/</span>
              <button
                onClick={() => setLang("ko")}
                className={cx(
                  "rounded-md px-2 py-1 text-xs",
                  lang === "ko" ? "bg-white text-black" : "text-white/80 hover:text-white"
                )}
                aria-pressed={lang === "ko"}
              >
                KR
              </button>
            </div>
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
              <a href="#projects" className="text-white/90" onClick={() => setMenuOpen(false)}>
                {t.navProjects}
              </a>
              <a href="#contact" className="text-white/90" onClick={() => setMenuOpen(false)}>
                {t.navContact}
              </a>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setLang("en");
                    setMenuOpen(false);
                  }}
                  className={cx(
                    "rounded-md px-2 py-1 text-xs border border-white/15",
                    lang === "en" ? "bg-white text-black" : "text-white/80"
                  )}
                >
                  EN
                </button>
                <button
                  onClick={() => {
                    setLang("ko");
                    setMenuOpen(false);
                  }}
                  className={cx(
                    "rounded-md px-2 py-1 text-xs border border-white/15",
                    lang === "ko" ? "bg-white text-black" : "text-white/80"
                  )}
                >
                  KR
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <Section id="hero" className="pt-16">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 p-8 md:p-14">
          <div className="pointer-events-none absolute -inset-6 md:-inset-10 rounded-[2rem] bg-[radial-gradient(60%_50%_at_22%_28%,rgba(0,0,0,0.55),transparent_60%)]" />
          <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1
                className="max-w-2xl text-4xl font-bold leading-tight text-white md:text-6xl"
                style={{ textShadow: "0 2px 14px rgba(0,0,0,.85), 0 6px 32px rgba(0,0,0,.55)" }}
              >
                {t.heroTitle}
              </h1>
              <p
                className="mt-4 max-w-2xl text-base text-white/90 md:text-lg"
                style={{ textShadow: "0 1px 10px rgba(0,0,0,.75)" }}
              >
                {t.heroSubtitle}
              </p>

              <div className="mt-6 flex gap-3">
                <a
                  href="#projects"
                  className="inline-block rounded-2xl px-5 py-2.5 text-sm font-medium text-white border border-white/15 bg-white/10 hover:bg-white/15"
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}
                >
                  {t.btnViewProjects}
                </a>
                <a
                  href="#contact"
                  className="inline-block rounded-2xl px-5 py-2.5 text-sm font-medium text-white border border-white/15 bg-white/20 hover:bg-white/25"
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}
                >
                  {t.btnContact}
                </a>
              </div>

              {/* SNS */}
              <div className="mt-3 flex items-center gap-2">
                <a
                  href="https://vimeo.com/therenderstudio"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Vimeo"
                  title="Vimeo"
                  className="rounded-xl border border-white/15 bg-white/10 p-2 hover:bg-white/15 transition"
                >
                  <img
                    src={resolveAsset("icons/vimeo.png")}
                    alt="Vimeo"
                    className="h-5 w-5"
                    loading="lazy"
                    decoding="async"
                  />
                </a>
                <a
                  href="https://www.instagram.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  title="Instagram"
                  className="rounded-xl border border-white/15 bg-white/10 p-2 hover:bg-white/15 transition"
                >
                  <img
                    src={resolveAsset("icons/instagram-glyph.svg")}
                    alt="Instagram"
                    className="h-5 w-5"
                    loading="lazy"
                    decoding="async"
                  />
                </a>
                <a
                  href="https://x.com/"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="X"
                  title="X"
                  className="rounded-xl border border-white/15 bg-white/10 p-2 hover:bg-white/15 transition"
                >
                  <img
                    src={resolveAsset("icons/x.svg")}
                    alt="X"
                    className="h-5 w-5"
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              </div>
            </div>

            <div className={cx("mt-6 w-full rounded-2xl p-5 md:mt-0 md:w-[420px]", glass)}>
              <p className="text-xs uppercase tracking-widest text-white/70">Expertise</p>
              <ul className="mt-2 grid list-disc grid-cols-2 gap-x-6 gap-y-1 pl-4 text-sm text-white/90 md:grid-cols-1">
                <li>Advertising & Artistic Film Production</li>
                <li>Immersive Media Experiences</li>
                <li>Interactive Media & Installations</li>
                <li>Real-Time Visual Performances</li>
                <li>AI-Generated Media</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* SERVICES (toggle만 여기 한국어 적용) */}
      <Section id="services" className="py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {SERVICES(t).map((s) => (
            <div key={s.t} className={cx("rounded-3xl p-6", glass)}>
              <h3 className="text-xl font-semibold text-white">{s.t}</h3>
              <p className="mt-2 text-white/75">{s.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* PROJECTS */}
      <Section id="projects" className="pt-12 pb-16">
        <div className="mb-8 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2
              className="text-3xl font-bold text-white md:text-4xl"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,.75)" }}
            >
              {t.portfolioTitle}
            </h2>
            <p
              className="mt-2 max-w-2xl text-white/80"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,.55)" }}
            >
              {t.portfolioDesc}
            </p>
          </div>

          {/* Search + tags */}
          <div className="flex w-full flex-col items-stretch gap-3 md:w-auto md:flex-row md:items-center">
            <input
              type="search"
              placeholder={t.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 md:w-64"
            />
            <div className="flex flex-wrap gap-2">
              {[...new Set(["All", ...projects.flatMap((p) => p.tags || [])])].map((tg) => (
                <button
                  key={tg}
                  onClick={() => setTag(tg)}
                  className={
                    tg === tag
                      ? "rounded-full px-3 py-1 text-xs bg-white text-black"
                      : "rounded-full px-3 py-1 text-xs bg-white/10 text-white/80 border border-white/15 hover:bg-white/15"
                  }
                >
                  {tg === "All" ? t.tagAll : tg}
                </button>
              ))}
            </div>
          </div>
        </div>

        <PortfolioGrid items={paged} onFallbackClick={(it) => setActive(it)} t={t} />

        {visibleCount < filtered.length && (
          <div className="mt-6 flex justify-center">
            <Button onClick={handleLoadMore}>
              {t.more} ({visibleCount}/{filtered.length})
            </Button>
          </div>
        )}
      </Section>

      {/* ABOUT + REEL */}
      <Section id="about" className="py-16">
        <div className="grid items-start gap-8 md:grid-cols-2">
          <div className={cx("rounded-3xl p-6", glass)}>
            <h2 className="text-2xl font-semibold text-white">{t.aboutTitle}</h2>
            <p className="mt-3 text-white/85">{t.aboutP1}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/70">
              <p>{t.founded}</p>
              <p>{t.location}</p>
              <p>{t.team}</p>
              <p>{t.partners}</p>
            </div>
          </div>
          <div className={cx("overflow-hidden rounded-3xl", glass)}>
            {/* Vimeo vertical (auto thumbnail) */}
            <div className="aspect-[9/16] w-full bg-black/40">
              <iframe
                className="h-full w-full"
                src="https://player.vimeo.com/video/1044260115?title=0&byline=0&portrait=0"
                title="Showreel"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
                allowFullScreen
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-white/70">{t.showreel}</span>
              <Button as="a" href="#contact">{t.projectInquiry}</Button>
            </div>
          </div>
        </div>
      </Section>

      {/* CONTACT */}
      <Section id="contact" className="py-16">
        <div className={cx("rounded-3xl p-8 text-center", glass)}>
          <h2 className="text-3xl font-bold text-white" style={{ textShadow: "0 2px 12px rgba(0,0,0,.75)" }}>
            {t.contactTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/85" style={{ textShadow: "0 1px 8px rgba(0,0,0,.55)" }}>
            {t.contactSubtitle}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button as="a" href="mailto:hello@therenderstudio.com">hello@therenderstudio.com</Button>
          </div>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-5 text-sm text-white/60 md:flex-row md:px-8">
          <p>© {new Date().getFullYear()} TheRenderStudio — Media Art & Interactive</p>
          <div className="flex items-center gap-4">
            <a href="#projects" className="hover:text-white">{t.footerProjects}</a>
            <a href="#contact" className="hover:text-white">{t.footerContact}</a>
          </div>
        </div>
      </footer>

      {/* MODAL */}
      <Modal open={!!active} onClose={() => setActive(null)}>
        {active && <ProjectGallery item={active} />}
      </Modal>
    </div>
  );
}
