"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function Signup() {
  const supabase = createClient();
  const [phase, setPhase] = useState<"signup" | "profile">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setMsg(error.message);
    } else {
      setPhase("profile");
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log(user);

    if (user) {
      // Insert/Update into public."Users" (requires RLS policies for own row)
      const { error: upsertErr } = await supabase
        .from("Users")
        .upsert({ id: user.id, username: name });

      setLoading(false);
      if (upsertErr) {
        setMsg(upsertErr.message);
      } else {
        window.location.href = "/";
      }
    } else {
      try {
        await supabase.auth.updateUser({ data: { name } });
      } catch (_) {}
      setLoading(false);
      setMsg(
        "Check your email to verify your account. After confirming, your profile will be created. You can then sign in."
      );
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>
            {phase === "signup" ? "Create an account" : "Tell us your name"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {phase === "signup" ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <Input
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
              />
              <Input
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
              />
              {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
              <Button className="w-full" disabled={loading} type="submit">
                {loading ? "Creating…" : "Sign up"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Have an account?{" "}
                <Link className="underline" href="/login">
                  Sign in
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={saveProfile} className="space-y-4">
              <Input
                placeholder="Your name (e.g., Anna Tan)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
              <div className="flex gap-3">
                <Button className="w-full" disabled={loading} type="submit">
                  {loading ? "Saving…" : "Save & continue"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
