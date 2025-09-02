import React, { useEffect, useMemo, useState } from "react";
import ShinyText from "./TextAnimations/ShinyText/ShinyText";
import BubbleMenu from "./Components/BubbleMenu/BubbleMenu";
import Magnet from "./Animations/Magnet/Magnet";
import BallPit from "./Backgrounds/Ballpit/Ballpit";

const cx = (...classes) => classes.filter(Boolean).join(" ");
const glass =
  "backdrop-blur-xl bg-white/5 dark:bg-black/20 border border-white/10 shadow-[0_0_1px_#fff_inset,0_10px_40px_-10px_rgba(0,0,0,0.5)]";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative min-h-[100svh] bg-[#0b0e13] [color-scheme:dark]">
      {/* 🎨 Ballpit 배경 */}
      <BallPit
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
      />

      {/* 🔲 오버레이 */}
      <div className="fixed inset-0 z-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/35" />
        <div className="absolute left-0 top-0 h-[55vh] w-[70vw] md:w-[50vw] -translate-x-[5%] -translate-y-[5%] rounded-[50%] blur-2xl bg-black/30" />
      </div>

      {/* 📌 콘텐츠 */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 py-3 md:px-8 flex justify-between">
          <a href="#" className="text-lg font-semibold text-white">
            TheRenderStudio
          </a>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-white"
          >
            ☰
          </button>
        </div>
      </header>

      <main className="relative z-20">
        <section id="hero" className="py-20 text-white">
          <h1 className="text-5xl font-bold">
            Creative Media for{" "}
            <ShinyText className="text-white">Exhibitions</ShinyText>
          </h1>
        </section>
      </main>

      {/* Quick Menu */}
      <BubbleMenu
        items={[
          { href: "#projects", label: "Projects", icon: "🎬" },
          { href: "#services", label: "Services", icon: "🛠" },
          { href: "#about", label: "About", icon: "ℹ️" },
          { href: "#contact", label: "Contact", icon: "✉️" },
        ]}
      />
    </div>
  );
}
