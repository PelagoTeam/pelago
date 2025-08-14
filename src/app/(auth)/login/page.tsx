"use client";
import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthProfileContext";
import { Eye, EyeOff, LogIn } from "lucide-react";

/**
 * Conservative, syntax-safe login page (no optional-call chaining, no exotic class syntax).
 * Keeps the creative split layout & glassmorphism without touching global css.
 */
export default function Login() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth() || ({} as any);
  const searchParams = useSearchParams();

  const next = searchParams?.get("next") || "/home";

  function normalizeAuthError(e: unknown) {
    try {
      const msg = (e as any)?.message
        ? String((e as any).message).toLowerCase()
        : String(e || "");
      if (msg.indexOf("email not confirmed") !== -1)
        return "Please verify your email before signing in.";
      if (msg.indexOf("invalid login credentials") !== -1)
        return "Invalid email or password.";
      return "Sign-in failed. Please try again.";
    } catch {
      return "Sign-in failed. Please try again.";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      router.replace(next);
    } catch (err) {
      setError(normalizeAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/20">
      {/* Decorative background: simple radial glows only (safe in all setups) */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-secondary/30 blur-3xl" />

      <TopBrand />

      <div className="relative z-10 mx-auto max-w-6xl grid min-h-[100dvh] items-center md:grid-cols-2 gap-10 px-6 lg:px-8">
        {/* Left Panel */}
        <section className="hidden md:flex flex-col justify-center gap-8 p-6 lg:p-8">
          {" "}
          <h1 className="text-4xl/tight lg:text-5xl/tight font-semibold tracking-tight">
            Welcome back 👋
            <br />
            <span className="text-primary">Sign in</span> to continue.
          </h1>
          <ul className="mt-6 space-y-3 text-muted-foreground list-disc pl-6 marker:text-primary">
            <li>Learn naturally, speak confidently</li>
            <li>Your personal path to fluency</li>
            <li>Practice anywhere, master every word</li>
          </ul>
        </section>

        {/* Right Panel */}
        <section className="flex items-center justify-center p-6 lg:p-8">
          <div className="w-full max-w-md">
            <Card className="backdrop-blur bg-card/80 shadow-xl border-border/60">
              <CardHeader className="space-y-2">
                <CardTitle className="text-center text-2xl">Sign in</CardTitle>
                <p className="text-center text-sm text-muted-foreground">
                  Don’t have an account?{" "}
                  <Link className="underline" href="/signup">
                    Create one
                  </Link>
                </p>
                {user && (
                  <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    You’re already signed in.
                    <span className="mx-1">•</span>
                    <Link href={next} className="underline">
                      Continue
                    </Link>
                    <span className="mx-1">or</span>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="underline"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="email">
                      Email
                    </label>
                    <Input
                      id="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium" htmlFor="password">
                        Password
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-xs underline text-muted-foreground hover:text-foreground"
                      >
                        Forgot?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPwd ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground"
                        aria-label={showPwd ? "Hide password" : "Show password"}
                      >
                        {showPwd ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-500" role="alert">
                      {error}
                    </p>
                  )}

                  <Button
                    className="w-full gap-2"
                    disabled={loading}
                    type="submit"
                  >
                    <LogIn className="h-4 w-4" />
                    {loading ? "Signing in…" : "Sign in"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

function TopBrand() {
  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
      <span className="block text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
        Pelago
      </span>
    </div>
  );
}
