"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthProfileContext";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

const headline = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const ui = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [loading, user, router]);

  // Smooth vertical pan for the background video
  const mainRef = useRef<HTMLDivElement | null>(null);
  const [bgY, setBgY] = useState<number>(12);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) {
      return;
    }
    let ticking = false;
    function onScroll() {
      if (ticking) {
        return;
      }
      ticking = true;
      requestAnimationFrame(() => {
        const max = el!.scrollHeight - el!.clientHeight;
        const p = max > 0 ? el!.scrollTop / max : 0; // 0..1
        setBgY(10 + 80 * Math.min(Math.max(p, 0), 1)); // 10% -> 90%
        ticking = false;
      });
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (!loading && user) {
    return null;
  }

  return (
    <div className={`relative min-h-screen text-white ${ui.className}`}>
      <BackgroundVideo yPercent={bgY} src="/pelago.mp4" />

      <SiteHeader />

      <main
        ref={mainRef}
        className="overflow-y-auto relative z-10 h-screen snap-y snap-proximity no-scrollbar"
      >
        {/* Section 1 — LEFT aligned */}
        <section className="h-screen snap-start">
          <div className="grid items-center px-4 mx-auto max-w-6xl h-full">
            <div className="max-w-xl">
              <Badge>Built for Southeast Asia</Badge>

              <h1
                className={`${headline.className} mt-4 text-4xl sm:text-6xl font-semibold leading-tight`}
                style={{ textShadow: "0 2px 16px rgba(0,0,0,.55)" }}
              >
                See Southeast Asia.{" "}
                <span className="text-orange-300">Speak</span> Southeast Asia.
              </h1>

              <p
                className="mt-4 text-lg text-white/90"
                style={{ textShadow: "0 1px 12px rgba(0,0,0,.45)" }}
              >
                Pelago blends language with culture so your first hello, market
                haggle, and coffee chat feel natural.
              </p>
              <ScrollHint />
            </div>
          </div>
        </section>

        {/* Section 2 — RIGHT aligned */}
        <section className="h-screen snap-start">
          <div className="grid items-center px-4 mx-auto max-w-6xl h-full">
            <div className="ml-auto max-w-xl text-right">
              <h2
                className={`${headline.className} text-3xl sm:text-5xl font-semibold leading-tight`}
                style={{ textShadow: "0 2px 16px rgba(0,0,0,.55)" }}
              >
                Culture-first lessons
              </h2>

              <p
                className="mt-4 text-white/90"
                style={{ textShadow: "0 1px 12px rgba(0,0,0,.45)" }}
              >
                Quick practice sets and phrasebook tips tuned to Thai,
                Vietnamese, Tagalog, Singlish and more.
              </p>

              <div className="flex flex-wrap gap-2 justify-end mt-5">
                {[
                  "AI role-plays",
                  "Culture tips",
                  "Phrasebook",
                  "Pronunciation",
                ].map((t) => (
                  <span
                    key={t}
                    className="py-1 px-3 text-xs font-medium rounded-full bg-white/10 text-white/90"
                    style={{ textShadow: "0 1px 8px rgba(0,0,0,.4)" }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              <ScrollHint align="right" />
            </div>
          </div>
        </section>

        {/* Section 3 — LEFT aligned */}
        <section className="h-screen snap-start">
          <div className="grid items-center px-4 mx-auto max-w-6xl h-full">
            <div className="max-w-xl">
              <h2
                className={`${headline.className} text-3xl sm:text-5xl font-semibold leading-tight`}
                style={{ textShadow: "0 2px 16px rgba(0,0,0,.55)" }}
              >
                AI role-plays, real scenarios
              </h2>

              <p
                className="mt-4 text-white/90"
                style={{ textShadow: "0 1px 12px rgba(0,0,0,.45)" }}
              >
                Practice markets, transit, and street food chats with feedback
                on tone and etiquette.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/* ---------- UI ---------- */

function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 bg-transparent">
      <div className="absolute inset-0 bg-gradient-to-b to-transparent pointer-events-none from-black/45 via-black/20" />
      <div className="flex relative justify-between items-center py-3 px-4 mx-auto max-w-6xl">
        <Link
          href="/"
          className="flex gap-2 items-center text-lg text-white"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}
        >
          <span className="inline-flex justify-center items-center w-8 h-8 text-white bg-orange-600 rounded-lg">
            🌊
          </span>
          <span className={headline.className}>Pelago</span>
        </Link>
        <div className="flex gap-2 items-center">
          <Button
            asChild
            variant="ghost"
            className="text-white rounded-lg hover:bg-white/10"
          >
            <Link href="/login">Sign in</Link>
          </Button>
          <Button
            asChild
            className="bg-white rounded-lg text-stone-900 hover:bg-white/90"
          >
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center py-1 px-3 text-xs font-semibold rounded-full bg-white/10 text-white/90"
      style={{ textShadow: "0 1px 8px rgba(0,0,0,.4)" }}
    >
      {children}
    </span>
  );
}

function ScrollHint({ align = "left" as "left" | "right" }) {
  return (
    <div
      className={`mt-8 flex items-center ${align === "right" ? "justify-end" : "justify-start"} gap-2 text-white/80 text-sm`}
      style={{ textShadow: "0 1px 8px rgba(0,0,0,.5)" }}
    >
      <ChevronDown className="w-4 h-4" /> Scroll
    </div>
  );
}

/** Fixed background video; single MP4; object-position glides with scroll */
function BackgroundVideo({ yPercent, src }: { yPercent: number; src: string }) {
  const y = Math.round(yPercent * 100) / 100;
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <video
        className="object-cover w-full h-full"
        style={{
          objectPosition: `50% ${y}%`,
          transition: "object-position 140ms linear",
        }}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
      >
        <source src={src} type="video/mp4" />
      </video>

      {/* dark vignette for readability */}
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-gradient-to-b via-transparent from-black/35 to-black/40" />
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="relative z-10 bg-transparent">
      <div className="absolute inset-0 bg-gradient-to-t to-transparent pointer-events-none from-black/45 via-black/20" />
      <div className="flex relative justify-between items-center py-10 px-4 mx-auto max-w-6xl">
        <div
          className="flex gap-2 items-center text-sm text-white/90"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}
        >
          <span className="inline-flex justify-center items-center w-8 h-8 text-white bg-orange-600 rounded-lg">
            🌊
          </span>
          <span>Pelago © {new Date().getFullYear()}</span>
        </div>
        <nav className="hidden gap-6 text-sm md:flex">
          <Link
            href="/privacy"
            className="hover:text-white text-white/90"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="hover:text-white text-white/90"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
