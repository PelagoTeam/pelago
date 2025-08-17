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
import { Check, Loader2, Menu } from "lucide-react";
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
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
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
  const { user, profile, signOut, refresh, loading: authLoading } = useAuth();
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

  if (!profile && user && !authLoading) return <CoursePickerPage />;

  const initials = (
    profile?.username?.[0] ??
    user?.email?.[0] ??
    "U"
  ).toUpperCase();

  async function switchCourse(courseId: string) {
    if (!profile || switchingId === courseId) return;
    try {
      setSwitchingId(courseId);
      const { error } = await supabase
        .from("Users")
        .update({ current_course: courseId })
        .eq("id", profile.id);

      if (error) throw error;
      const next = userCourses.find((c) => c.course_id === courseId);
      if (next) setCurrentCourse(next);
      await refresh();
    } catch (e) {
      console.error("[Course switch] error:", e);
    } finally {
      setSwitchingId(null);
      router.replace("/home");
    }
  }

  return (
    <RequireAuth>
      <div className="flex flex-col w-full h-full">
        <header className="sticky top-0 z-40 px-5 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex justify-between items-center px-4 h-16">
            <div className="flex gap-6 justify-between items-center w-full">
              <h1
                className={cn(
                  "text-xl font-semibold tracking-tight",
                  "bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent",
                )}
              >
                Pelago
              </h1>

              {/* Desktop nav */}

              <div className="hidden gap-2 items-center py-1 px-2 rounded-xl ring-1 sm:flex bg-primary/10 ring-primary/20">
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
                                  : "border-border",
                              )}
                              title={c.language}
                            >
                              <Avatar
                                className={cn(
                                  "h-10 w-10 ring-1 ring-border",
                                  isActive && "ring-primary/60",
                                )}
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
              {/* Mobile nav */}
              <div className="container py-2 px-4 mx-auto max-w-screen-xl sm:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl"
                      aria-label="Open menu"
                    >
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>

                  <SheetContent side="left" className="p-4">
                    <SheetHeader>
                      <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>

                    <nav className="grid gap-2 mt-4">
                      <SheetClose asChild>
                        <NavItem href="/home" label="Practice" />
                      </SheetClose>
                      <SheetClose asChild>
                        <NavItem
                          href="/home/conversation"
                          label="Conversation"
                        />
                      </SheetClose>
                      <SheetClose asChild>
                        <NavItem href="/home/leaderboard" label="Leaderboard" />
                      </SheetClose>
                    </nav>
                  </SheetContent>
                </Sheet>
              </div>
              <div className="flex gap-3 items-center">
                {user && !loading && currentCourse ? (
                  <>
                    <div className="hidden flex-col items-end leading-tight sm:flex">
                      <span className="text-sm font-medium">
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
                        align="center"
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
        </header>

        <div className="flex-1 py-6 min-h-0">{children}</div>
      </div>
    </RequireAuth>
  );
}
