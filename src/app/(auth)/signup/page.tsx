"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Eye, EyeOff, UserPlus, Loader2 } from "lucide-react";

type Slide = {
  mp4: string;
  headline: string;
  sub: string;
};

const SLIDES: Slide[] = [
  {
    mp4: "/pelago-1.mp4",
    headline: "Capturing Moments, Creating Memories",
    sub: "Learn naturally with immersive, real-world role-plays.",
  },
  {
    mp4: "/pelago-2.mp4",
    headline: "Speak with Confidence",
    sub: "Adaptive feedback that meets you where you are.",
  },
  {
    mp4: "/pelago-3.mp4",
    headline: "Culture-first Learning",
    sub: "SEA-focused content grounded in real situations.",
  },
];

export default function SignUpPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // UI state
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // carousel
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (SLIDES.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, []);

  function normalizeAuthError(e: unknown) {
    try {
      const msg = (e as any)?.message
        ? String((e as any).message).toLowerCase()
        : String(e || "");
      if (msg.includes("user already registered")) return "This email is already registered.";
      if (msg.includes("password should be at least")) return "Password does not meet requirements.";
      return "Sign-up failed. Please try again.";
    } catch {
      return "Sign-up failed. Please try again.";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setNotice(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: name } },
      });
      if (error) throw error;
      router.replace("/home");
    } catch (err) {
      setError(normalizeAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  const slide = SLIDES[idx];

  return (
    // Full-screen, no scroll
    <div className="relative h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/40">
      {/* Soft blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-secondary/20 blur-3xl" />

      {/* Centered split shell */}
      <div className="relative z-10 mx-auto h-full max-w-6xl px-4 sm:px-6 md:px-8 flex items-center">
        <div className="grid h-[90vh] w-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 shadow-2xl backdrop-blur-xl md:grid-cols-2">
          {/* LEFT: Video + overlays */}
          <aside className="relative hidden md:block">
            {/* Top utility bar */}
            <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-4">
              <span className="pointer-events-auto select-none rounded-full bg-background/60 px-3 py-1 text-sm font-semibold backdrop-blur">
                Pelago
              </span>
              <Link
                href="/"
                className="pointer-events-auto rounded-full bg-background/60 px-3 py-1 text-xs underline backdrop-blur"
              >
                Back to website
              </Link>
            </div>

            {/* Video */}
            <div className="absolute inset-0">
              <video
                key={idx} // restart playback on slide change
                className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                controls={false}
                onContextMenu={(e) => e.preventDefault()}
                aria-hidden="true"
                tabIndex={-1}
              >
                <source src={slide.mp4} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Gradient scrims */}
            <div className="absolute inset-0 bg-gradient-to-tr from-background/70 via-background/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background/70 to-transparent" />

            {/* Copy */}
            <div className="relative z-10 flex h-full w-full flex-col justify-end p-8">
              <div className="max-w-lg space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight text-balance">
                  {slide.headline}
                </h2>
                <p className="text-sm text-muted-foreground">{slide.sub}</p>
              </div>

              {/* Dots */}
              {SLIDES.length > 1 && (
                <div className="mt-6 flex gap-2">
                  {SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      className={`h-2 w-6 rounded-full transition ${i === idx ? "bg-primary" : "bg-muted/60 hover:bg-muted/80"
                        }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* RIGHT: Sign-up card (email/password only) */}
          <main className="flex items-center justify-center p-6 sm:p-10">
            <div className="w-full max-w-md">
              <Card className="border-border/60 bg-card/80 shadow-xl backdrop-blur-xl">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-2xl">Create an account</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="underline underline-offset-4">
                      Log in
                    </Link>
                  </p>
                </CardHeader>

                <CardContent>
                  <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        type="text"
                        autoComplete="name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        required
                        autoComplete="email"
                        inputMode="email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          type={showPwd ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd(!showPwd)}
                          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground"
                          aria-label={showPwd ? "Hide password" : "Show password"}
                        >
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm"
                          placeholder="••••••••"
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          type={showConfirm ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground"
                          aria-label={showConfirm ? "Hide password" : "Show password"}
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <p className="text-sm text-red-500" role="alert" aria-live="polite">
                        {error}
                      </p>
                    )}
                    {notice && (
                      <p className="text-sm text-green-600" role="status" aria-live="polite">
                        {notice}
                      </p>
                    )}

                    <Button className="w-full gap-2" disabled={loading} type="submit">
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating…
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4" />
                          Create account
                        </>
                      )}
                    </Button>
                  </form>

                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    By continuing, you agree to our{" "}
                    <Link href="/terms" className="underline underline-offset-4">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="underline underline-offset-4">
                      Privacy Policy
                    </Link>
                    .
                  </p>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
