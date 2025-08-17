"use client";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Sign-up page that mirrors the login page styling (split layout, soft glows,
 * centered content). Subtle variations: title, copy, additional fields, and
 * email verification message after sign up. No global CSS changes required.
 */
export default function SignUpPage() {
  const supabase = useMemo(() => createClient(), []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  function normalizeAuthError(e: unknown) {
    try {
      const msg = (e as any)?.message
        ? String((e as any).message).toLowerCase()
        : String(e || "");
      if (msg.indexOf("user already registered") !== -1)
        return "This email is already registered.";
      if (msg.indexOf("password should be at least") !== -1)
        return "Password does not meet requirements.";
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

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/20">
      {/* Background glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-secondary/30 blur-3xl" />

      {/* Top brand, same as login */}
      <TopBrand />

      <div className="relative z-10 mx-auto max-w-6xl grid min-h-[100dvh] items-center md:grid-cols-2 gap-10 px-6 lg:px-8">
        {/* Left side: hero copy */}
        <section className="hidden md:flex flex-col justify-center gap-8 p-6 lg:p-8">
          <h1 className="text-4xl/tight lg:text-5xl/tight font-semibold tracking-tight">
            Start your language journey <span aria-hidden>✨</span>
            <br />
            <span className="text-primary">Create an account</span> to begin.
          </h1>
          <ul className="mt-6 space-y-3 text-muted-foreground list-disc pl-6 marker:text-primary">
            <li>Lessons that adapt to you</li>
            <li>Real-world phrases you{"'"}will use</li>
            <li>Progress that stays in sync</li>
          </ul>
        </section>

        {/* Right side: sign up card */}
        <section className="flex items-center justify-center p-6 lg:p-8">
          <div className="w-full max-w-md">
            <Card className="backdrop-blur bg-card/80 shadow-xl border-border/60">
              <CardHeader className="space-y-2">
                <CardTitle className="text-center text-2xl">
                  Create account
                </CardTitle>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link className="underline" href="/login">
                    Sign in
                  </Link>
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="name">
                      Name
                    </label>
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
                    <label className="text-sm font-medium" htmlFor="password">
                      Password
                    </label>
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
                        {showPwd ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="confirm">
                      Confirm Password
                    </label>
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
                        aria-label={
                          showConfirm ? "Hide password" : "Show password"
                        }
                      >
                        {showConfirm ? (
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
                  {notice && (
                    <p className="text-sm text-green-600" role="status">
                      {notice}
                    </p>
                  )}

                  <Button
                    className="w-full gap-2"
                    disabled={loading}
                    type="submit"
                  >
                    <UserPlus className="h-4 w-4" />
                    {loading ? "Creating…" : "Create account"}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    By continuing, you agree to our{" "}
                    <Link href="/terms" className="underline">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="underline">
                      Privacy
                    </Link>
                    .
                  </p>
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
