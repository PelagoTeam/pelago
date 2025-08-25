"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthProfileContext";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  LogOut,
  Mail,
  Save,
  User2,
  RotateCcw,
  Trophy,
  Calendar,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UserMeta = {
  created_at: string | null;
  total_points: number | null;
};

export default function ProfilePage() {
  const { user, profile, loading: authLoading, signOut, refresh } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [username, setUsername] = useState(profile?.username ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<null | {
    type: "ok" | "err";
    msg: string;
  }>(null);

  const [meta, setMeta] = useState<UserMeta>({
    created_at: null,
    total_points: null,
  });
  const [metaLoading, setMetaLoading] = useState(true);

  const [coursesCount, setCoursesCount] = useState<number>(0);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    setUsername(profile?.username ?? "");
  }, [profile?.username]);

  // Fetch created_at & total_points
  useEffect(() => {
    const fetchMeta = async () => {
      if (!user) return;
      setMetaLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("created_at, total_points")
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        setMeta({
          created_at: data.created_at ?? null,
          total_points: (data.total_points as number | null) ?? 0,
        });
      }
      setMetaLoading(false);
    };
    fetchMeta();
  }, [user, supabase]);

  // Fetch courses count
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) return;
      setCoursesLoading(true);

      const { count, error } = await supabase
        .from("user_courses")
        .select("course_id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!error && count !== null) setCoursesCount(count);
      setCoursesLoading(false);
    };
    fetchCourses();
  }, [user, supabase]);

  const dirty = (profile?.username ?? "") !== username;

  async function handleSave() {
    setStatus(null);
    setSaving(true);
    try {
      const trimmed = username.trim();
      if (trimmed.length > 0 && trimmed.length < 3) {
        setStatus({
          type: "err",
          msg: "Username must be at least 3 characters.",
        });
        return;
      }

      const { error } = await supabase
        .from("users")
        .update({ username: trimmed.length ? trimmed : null })
        .eq("user_id", user!.id);

      if (error) throw error;

      setStatus({ type: "ok", msg: "Profile saved." });
      await refresh();
    } catch (err: unknown) {
      let msg = "Could not save changes.";
      if (typeof err === "string") msg = err;
      else if (err instanceof Error) msg = err.message;
      console.error("[Profile] save error:", msg, err);
      setStatus({ type: "err", msg });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setUsername(profile?.username ?? "");
    setStatus(null);
  }

  if (authLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>Loading…</CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid place-items-center h-[60vh] text-muted-foreground">
        Please sign in to view your profile.
      </div>
    );
  }

  const initials = (
    user.email?.trim()[0] ??
    user.user_metadata?.name?.trim()[0] ??
    "U"
  ).toUpperCase();
  const emailVerified = Boolean(user.email_confirmed_at);

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="relative grid place-items-center h-16 w-16 rounded-full bg-primary/10 text-primary">
              <span className="text-xl font-semibold">{initials}</span>
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-secondary text-secondary-foreground border">
                <User2 className="h-4 w-4" />
              </span>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{user.email}</span>
                <Badge
                  variant={emailVerified ? "secondary" : "outline"}
                  className={cn(
                    "ml-2",
                    emailVerified ? "border-transparent" : "",
                  )}
                >
                  {emailVerified ? "Verified" : "Unverified"}
                </Badge>
              </div>

              {/* Quick meta */}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" />
                  {metaLoading ? "…" : `${meta.total_points ?? 0} pts`}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {metaLoading || !meta.created_at
                    ? "…"
                    : new Date(meta.created_at).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" />
                  {coursesLoading
                    ? "…"
                    : `${coursesCount} course${coursesCount === 1 ? "" : "s"}`}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Total points</div>
              <div className="text-lg font-semibold">
                {metaLoading ? "…" : (meta.total_points ?? 0)}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Date joined</div>
              <div className="text-lg font-semibold">
                {metaLoading || !meta.created_at
                  ? "…"
                  : new Date(meta.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">
                Courses enrolled
              </div>
              <div className="text-lg font-semibold">
                {coursesLoading ? "…" : coursesCount}
              </div>
            </div>
          </div>

          {/* Username editor */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username" className="text-sm">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Pick a display name"
                autoComplete="off"
              />
              <div className="text-xs text-muted-foreground">
                This will be visible on leaderboards and your profile.
              </div>
            </div>
          </div>

          {/* Status */}
          {status && (
            <div
              className={cn(
                "rounded-md border px-3 py-2 text-sm",
                status.type === "ok"
                  ? "bg-secondary text-secondary-foreground border-transparent"
                  : "bg-destructive/10 text-destructive border-destructive/30",
              )}
            >
              {status.msg}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!dirty || saving}
              className={cn(!dirty || saving ? "opacity-90" : "")}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save changes
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!dirty || saving}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
