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
import { Loader2, LogOut, Mail, Save, User2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

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
        .from("Users")
        .update({
          username: trimmed.length ? trimmed : null,
        })
        .eq("id", user!.id);

      if (error) throw error;

      setStatus({ type: "ok", msg: "Profile saved." });
      await refresh(); // re-pull profile into context
    } catch (e: any) {
      console.error("[Profile] save error:", e?.message ?? e);
      setStatus({ type: "err", msg: "Could not save changes." });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setUsername(profile?.username ?? "");
    setStatus(null);
  }

  // skeletons / guards
  if (authLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2 w-full">
                <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
                <div className="h-4 w-1/4 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="h-9 w-full bg-muted rounded animate-pulse" />
            <div className="h-9 w-full bg-muted rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-9 w-28 bg-muted rounded animate-pulse" />
              <div className="h-9 w-28 bg-muted rounded animate-pulse" />
            </div>
          </CardContent>
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

  // helper: initial from email
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
          {/* Header row */}
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
                    emailVerified ? "border-transparent" : ""
                  )}
                >
                  {emailVerified ? "Verified" : "Unverified"}
                </Badge>
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
                  : "bg-destructive/10 text-destructive border-destructive/30"
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
