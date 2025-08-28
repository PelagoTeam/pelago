"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthProfileContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import {
  BookOpen,
  Check,
  Loader2,
  Menu,
  MessageSquareText,
  Trophy,
} from "lucide-react";
import CoursePickerPage from "@/components/SignUp/RegisterCourse";
import RequireAuth from "@/components/RequireAuth";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  const { user, profile, signOut, refresh, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [currentCourse, setCurrentCourse] = useState<Course>();
  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const fetchIcon = async () => {
      if (profile) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from("courses")
            .select("icon_url, language, course_id");
          if (error) throw error;
          if (data) {
            setAvailableCourses(data);
            setCurrentCourse(
              data.find((c) => c.course_id === profile.current_course),
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

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 640) {
        setOpen(false);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!profile && user && !authLoading) return <CoursePickerPage />;

  const initials = (
    profile?.username?.[0] ??
    user?.email?.[0] ??
    "U"
  ).toUpperCase();

  async function switchCourse(course: Course) {
    if (!profile || switchingId === course.course_id) return;
    try {
      setSwitchingId(course.course_id);
      const { error } = await supabase
        .from("users")
        .update({ current_course: course.course_id, language: course.language })
        .eq("user_id", profile.user_id);
      const { error: ucErr } = await supabase.from("user_courses").upsert(
        {
          user_id: profile.user_id,
          course_id: course.course_id,
          module_number: 0,
          stage_number: 0,
        },
        {
          ignoreDuplicates: true,
        },
      );

      if (error || ucErr) throw error || ucErr;
      const next = availableCourses.find(
        (c) => c.course_id === course.course_id,
      );
      if (next) setCurrentCourse(next);
    } catch (e) {
      console.error("[Course switch] error:", e);
    } finally {
      setSwitchingId(null);
      refresh();
      if (pathname === "/home") {
        router.replace("/home");
      } else if (pathname === "/home/conversation") {
        router.replace("/home/conversation");
      }
    }
  }

  return (
    <RequireAuth>
      <div className="flex flex-col w-full h-full">
        <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/55">
          <div className="mx-auto max-w-screen-2xl px-4">
            <div className="flex h-16 items-center justify-between">
              <div className="flex flex-1 items-center justify-left">
                <div className="px-3 py-2 mx-auto max-w-screen-xl flex flex-col items-center justify-center md:hidden">
                  <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                      <Menu className="w-5 h-5" />
                    </SheetTrigger>

                    <SheetContent
                      side="left"
                      className="px-4 w-[250px] flex flex-col justify-between"
                    >
                      <div>
                        <SheetHeader className="items-start gap-1">
                          <SheetTitle className="text-left">
                            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                              Pelago
                            </span>
                          </SheetTitle>
                          <p className="text-xs text-muted-foreground">
                            Learn • Chat • Compete
                          </p>
                        </SheetHeader>

                        {user && currentCourse && (
                          <div className="mt-4 flex items-center gap-3 rounded-xl border p-3">
                            <Avatar className="w-10 h-10 ring-1 ring-border">
                              <AvatarImage
                                src={currentCourse.icon_url}
                                alt={currentCourse.language}
                              />
                              <AvatarFallback className="bg-muted text-foreground">
                                {currentCourse.language}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {profile?.username ?? user.email}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {currentCourse.language}
                              </div>
                            </div>
                            <div className="ml-auto">
                              <Avatar className="w-8 h-8 ring-1 ring-border">
                                <AvatarImage src={undefined} alt="avatar" />
                                <AvatarFallback className="bg-muted text-foreground">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </div>
                        )}

                        {/* Nav */}
                        <nav className="mt-4 space-y-5">
                          <div className="space-y-1">
                            <h4 className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                              Learn
                            </h4>
                            <div className="grid gap-1.5">
                              <MobileNavItem
                                href="/home"
                                label="Practice"
                                Icon={BookOpen}
                              />
                              <MobileNavItem
                                href="/home/conversation"
                                label="Conversation"
                                Icon={MessageSquareText}
                              />
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-1">
                            <h4 className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                              Compete
                            </h4>
                            <div className="grid gap-1.5">
                              <MobileNavItem
                                href="/home/leaderboard"
                                label="Leaderboard"
                                Icon={Trophy}
                              />
                            </div>
                          </div>
                        </nav>
                      </div>
                      {/* Footer */}
                      <footer className="mt-6 pt-4 border-t mb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">
                            v1.0
                          </span>
                        </div>
                      </footer>
                    </SheetContent>
                  </Sheet>
                </div>
                <Link
                  href="/home"
                  className="flex-1 text-xl font-semibold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
                >
                  <h1>Pelago</h1>
                </Link>
              </div>

              <div className="hidden md:flex flex-1 justify-center">
                <div className="bg-primary/10 flex gap-2 rounded-xl ring-1 items-center py-1 px-2 ring-primary/20 justify-center ">
                  {user && !loading && currentCourse ? (
                    <HoverCard openDelay={120} closeDelay={80}>
                      <HoverCardTrigger asChild>
                        <Avatar className="w-9 h-9 ring-1 cursor-pointer ring-border">
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
                        className="p-3 w-80 border bg-card"
                      >
                        <div className="mb-2 text-xs font-medium text-muted-foreground">
                          Your courses
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {availableCourses.map((c) => {
                            const isActive =
                              c.course_id === profile?.current_course;
                            const isBusy = switchingId === c.course_id;
                            return (
                              <button
                                key={c.course_id}
                                type="button"
                                onClick={() => switchCourse(c)}
                                disabled={isBusy}
                                className={`group relative flex flex-col items-center gap-1 rounded-lg border p-2 transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 
                                  ${
                                    isActive
                                      ? "border-primary/50 bg-primary/5"
                                      : "border-border"
                                  }
                                `}
                                title={c.language}
                              >
                                <Avatar
                                  className={`h-10 w-10 ring-1 ring-border ${isActive && "ring-primary/60"}`}
                                >
                                  <AvatarImage
                                    src={c.icon_url}
                                    alt={c.language}
                                  />
                                  <AvatarFallback className="bg-muted text-foreground">
                                    {c.language}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-foreground/80 truncate max-w-[6rem]">
                                  {c.language}
                                </span>
                                {isActive && !isBusy && (
                                  <span className="grid absolute -top-2 -right-2 place-items-center w-5 h-5 rounded-full bg-primary text-primary-foreground">
                                    <Check className="w-3 h-3" />
                                  </span>
                                )}
                                {isBusy && (
                                  <span className="grid absolute -top-2 -right-2 place-items-center w-5 h-5 rounded-full bg-secondary">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ) : null}
                  <nav className="hidden gap-2 items-center p-1 rounded-full sm:flex bg-muted/30">
                    <NavItem href="/home" label="Practice" />
                    <NavItem href="/home/conversation" label="Conversation" />
                    <NavItem href="/home/leaderboard" label="Leaderboard" />
                  </nav>
                </div>
              </div>

              <div className="flex gap-3 items-center flex-1 justify-end">
                {user && !loading && currentCourse ? (
                  <>
                    <div className="hidden flex-col items-end leading-tight sm:flex">
                      <span className="text-sm font-medium leading-none">
                        {profile?.username ?? user.email}
                      </span>
                    </div>
                    <HoverCard openDelay={120} closeDelay={80}>
                      <HoverCardTrigger asChild>
                        <Avatar className="w-9 h-9 ring-1 ring-border">
                          <AvatarImage src={undefined} alt="avatar" />
                          <AvatarFallback className="bg-muted text-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </HoverCardTrigger>
                      <HoverCardContent
                        align="end"
                        side="bottom"
                        className="p-3 w-auto border bg-card"
                      >
                        <Link
                          href="/home/profile"
                          className="flex gap-3 items-center"
                        >
                          <Button variant="ghost" className="hover:bg-accent">
                            View Profile
                          </Button>
                        </Link>
                        <Separator className="my-2" />
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
                      </HoverCardContent>
                    </HoverCard>
                  </>
                ) : (
                  <Link href="/login">
                    <Button>Sign in</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        </header>

        <div className="flex-1 py-6 min-h-0">{children}</div>
      </div>
    </RequireAuth>
  );
}

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
      className={`group relative inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background 
        ${
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-foreground/70 hover:text-foreground hover:bg-background/60"
        }
      `}
    >
      <span>{label}</span>
      <span className="pointer-events-none absolute -bottom-[6px] left-4 right-4 h-0.5 origin-left scale-x-0 rounded-full bg-current opacity-0 transition-all duration-200 ease-out group-hover:opacity-80 group-hover:scale-x-100" />
    </Link>
  );
}

function MobileNavItem({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <SheetClose asChild>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`group flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/40
          ${
            active
              ? "bg-primary/10 text-primary ring-1 ring-primary/30"
              : "hover:bg-muted text-foreground/90"
          }
        `}
      >
        <span className="flex items-center gap-3 min-w-0">
          <span
            className={`rounded-lg p-1.5 ${active ? "bg-primary/15" : "bg-muted"}`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium truncate">{label}</span>
        </span>
        <svg
          className={`h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 ${active && "opacity-100"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>
    </SheetClose>
  );
}
