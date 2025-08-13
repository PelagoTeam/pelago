"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthProfileContext";

// Fonts
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

const headline = Fraunces({ subsets: ["latin"], weight: ["600", "700"], display: "swap" });
const ui = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && user) router.replace("/home");
  }, [loading, user, router]);

  if (!loading && user) return null;

  // Smooth vertical pan for the background video
  const mainRef = React.useRef<HTMLDivElement | null>(null);
  const [bgY, setBgY] = React.useState<number>(12);

  React.useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const max = el.scrollHeight - el.clientHeight;
        const p = max > 0 ? el.scrollTop / max : 0; // 0..1
        setBgY(10 + 80 * Math.min(Math.max(p, 0), 1)); // 10% -> 90%
        ticking = false;
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={`relative min-h-screen text-white ${ui.className}`}>
      <BackgroundVideo yPercent={bgY} src="/pelago.mp4" />

      <SiteHeader />

      <main ref={mainRef} className="relative z-10 h-screen overflow-y-auto snap-y snap-proximity no-scrollbar">
        {/* Section 1 — LEFT aligned */}
        <section className="h-screen snap-start">
          <div className="mx-auto max-w-6xl h-full px-4 grid items-center">
            <div className="max-w-xl">
              <Badge>Built for Southeast Asia</Badge>

              <h1
                className={`${headline.className} mt-4 text-4xl sm:text-6xl font-semibold leading-tight`}
                style={{ textShadow: "0 2px 16px rgba(0,0,0,.55)" }}
              >
                See Southeast Asia. <span className="text-orange-300">Speak</span> Southeast Asia.
              </h1>

              <p className="mt-4 text-white/90 text-lg" style={{ textShadow: "0 1px 12px rgba(0,0,0,.45)" }}>
                Pelago blends language with culture so your first hello, market haggle, and coffee chat feel natural.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild className="rounded-xl bg-white text-stone-900 hover:bg-white/90">
                  <Link href="/signup">Start free</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl border-white/40 text-white hover:bg-white/10">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>

              <ScrollHint />
            </div>
          </div>
        </section>

        {/* Section 2 — RIGHT aligned */}
        <section className="h-screen snap-start">
          <div className="mx-auto max-w-6xl h-full px-4 grid items-center">
            <div className="max-w-xl ml-auto text-right">
              <h2
                className={`${headline.className} text-3xl sm:text-5xl font-semibold leading-tight`}
                style={{ textShadow: "0 2px 16px rgba(0,0,0,.55)" }}
              >
                Culture-first lessons
              </h2>

              <p className="mt-4 text-white/90" style={{ textShadow: "0 1px 12px rgba(0,0,0,.45)" }}>
                Quick practice sets and phrasebook tips tuned to Thai, Vietnamese, Tagalog, and Singlish.
              </p>

              <div className="mt-7 flex justify-end gap-3">
                <Button asChild className="rounded-xl bg-white text-stone-900 hover:bg-white/90">
                  <Link href="/signup">Try a demo set</Link>
                </Button>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                {["AI role-plays", "Culture tips", "Phrasebook", "Pronunciation"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90"
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
          <div className="mx-auto max-w-6xl h-full px-4 grid items-center">
            <div className="max-w-xl">
              <h2
                className={`${headline.className} text-3xl sm:text-5xl font-semibold leading-tight`}
                style={{ textShadow: "0 2px 16px rgba(0,0,0,.55)" }}
              >
                AI role-plays, real scenarios
              </h2>

              <p className="mt-4 text-white/90" style={{ textShadow: "0 1px 12px rgba(0,0,0,.45)" }}>
                Practice markets, transit, and street food chats with feedback on tone and etiquette.
              </p>

              <div className="mt-7 flex items-center gap-3">
                <Button asChild className="rounded-xl bg-white text-stone-900 hover:bg-white/90">
                  <Link href="/signup">Create free account</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl border-white/40 text-white hover:bg-white/10">
                  <Link href="/login">I already have an account</Link>
                </Button>
              </div>
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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg text-white"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white">🌊</span>
          <span className={headline.className}>Pelago</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#" className="text-white/90 hover:text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>
            Features
          </a>
          <a href="#" className="text-white/90 hover:text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>
            Languages
          </a>
          <a href="#" className="text-white/90 hover:text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>
            How it works
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="rounded-lg text-white hover:bg-white/10">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="rounded-lg bg-white text-stone-900 hover:bg-white/90">
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
      className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90"
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
      <ChevronDown className="h-4 w-4" /> Scroll
    </div>
  );
}

/** Fixed background video; single MP4; object-position glides with scroll */
function BackgroundVideo({ yPercent, src }: { yPercent: number; src: string }) {
  const y = Math.round(yPercent * 100) / 100;
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <video
        className="h-full w-full object-cover"
        style={{ objectPosition: `50% ${y}%`, transition: "object-position 140ms linear" }}
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/40" />
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="relative z-10 bg-transparent">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/20 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-4 py-10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-white/90" style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white">🌊</span>
          <span>Pelago © {new Date().getFullYear()}</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm">
          <Link href="/privacy" className="text-white/90 hover:text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>
            Privacy
          </Link>
          <Link href="/terms" className="text-white/90 hover:text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,.6)" }}>
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
