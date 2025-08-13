"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthProfileContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { Check, Loader2 } from "lucide-react";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive =
    pathname === href ||
    (href === "/home/practice" &&
      (pathname === "/home" || pathname === "/home/"));

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
        isActive
          ? "bg-primary text-primary-foreground shadow"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      {label}
    </Link>
  );
}

type Course = {
  icon_url: string;
  language: string;
  course_id: string;
};

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, signOut, refresh } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userCourses, setUserCourses] = useState<Course[]>([]);
  const [currentCourse, setCurrentCourse] = useState<Course>();
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchIcon = async () => {
      if (profile) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from("Courses")
            .select("icon_url, language, course_id");
          if (error) throw error;
          if (data) {
            setUserCourses(data);
            setCurrentCourse(
              data.find((c) => c.course_id === profile.current_course)
            );
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchIcon();
  }, [profile, supabase]);

  const initials = (
    profile?.username?.[0] ??
    user?.email?.[0] ??
    "U"
  ).toUpperCase();

  async function switchCourse(courseId: string) {
    if (!user || switchingId === courseId) return;
    try {
      setSwitchingId(courseId);
      const { error } = await supabase
        .from("Users")
        .update({ current_course: courseId })
        .eq("id", user.id);

      if (error) throw error;
      const next = userCourses.find((c) => c.course_id === courseId);
      if (next) setCurrentCourse(next);
      await refresh();
    } catch (e) {
      console.error("[Course switch] error:", e);
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-screen-xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1
              className={cn(
                "text-xl font-semibold tracking-tight",
                "bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
              )}
            >
              Pelago
            </h1>

            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-2 bg-muted/30 rounded-full p-1">
              <NavItem href="/home" label="Practice" />
              <NavItem href="/home/conversation" label="Conversation" />
              <NavItem href="/home/leaderboard" label="Leaderboard" />
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user && !loading && currentCourse ? (
              <>
                <HoverCard openDelay={120} closeDelay={80}>
                  <HoverCardTrigger asChild>
                    <Avatar className="h-9 w-9 ring-1 ring-border cursor-pointer">
                      <AvatarImage
                        src={currentCourse.icon_url}
                        alt={currentCourse.language}
                      />
                      <AvatarFallback className="bg-muted text-foreground">
                        {currentCourse.language}
                      </AvatarFallback>
                    </Avatar>
                  </HoverCardTrigger>
                  <HoverCardContent
                    align="start"
                    side="bottom"
                    className="w-80 p-3 border bg-card"
                  >
                    <div className="mb-2 text-xs font-medium text-muted-foreground">
                      Your courses
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {userCourses.map((c) => {
                        const isActive =
                          c.course_id === profile?.current_course;
                        const isBusy = switchingId === c.course_id;
                        return (
                          <button
                            key={c.course_id}
                            type="button"
                            onClick={() => switchCourse(c.course_id)}
                            disabled={isBusy}
                            className={cn(
                              "group relative flex flex-col items-center gap-1 rounded-lg border p-2 transition",
                              "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              isActive
                                ? "border-primary/50 bg-primary/5"
                                : "border-border"
                            )}
                            title={c.language}
                          >
                            <Avatar
                              className={cn(
                                "h-10 w-10 ring-1 ring-border",
                                isActive && "ring-primary/60"
                              )}
                            >
                              <AvatarImage src={c.icon_url} alt={c.language} />
                              <AvatarFallback className="bg-muted text-foreground">
                                {c.language}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-foreground/80 truncate max-w-[6rem]">
                              {c.language}
                            </span>
                            {isActive && !isBusy && (
                              <span className="absolute -top-2 -right-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                            {isBusy && (
                              <span className="absolute -top-2 -right-2 grid h-5 w-5 place-items-center rounded-full bg-secondary">
                                <Loader2 className="h-3 w-3 animate-spin" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </HoverCardContent>
                </HoverCard>
                <Link href="/home/profile" className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end leading-tight">
                    <span className="text-sm font-medium">
                      {profile?.username ?? user.email}
                    </span>
                  </div>
                  <Avatar className="h-9 w-9 ring-1 ring-border">
                    <AvatarImage src={undefined} alt="avatar" />
                    <AvatarFallback className="bg-muted text-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <Button
                  variant="ghost"
                  className="hover:bg-accent"
                  onClick={async () => {
                    await signOut();
                    router.push("/");
                  }}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button>Sign in</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Subtle divider */}
        <Separator className="opacity-60" />

        {/* Mobile nav */}
        <div className="sm:hidden container mx-auto max-w-screen-xl px-4 py-2">
          <div className="flex flex-wrap gap-2 bg-muted/30 rounded-xl p-2">
            <NavItem href="/home/practice" label="Practice" />
            <NavItem href="/home/conversation" label="Conversation" />
            <NavItem href="/home/leaderboard" label="Leaderboard" />
            <NavItem href="/home/profile" label="Profile" />
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-screen-xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
