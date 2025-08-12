"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthProfileContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const initials = (
    profile?.username?.[0] ??
    user?.email?.[0] ??
    "U"
  ).toUpperCase();

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
            {user ? (
              <>
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-sm font-medium">
                    {profile?.username ?? user.email}
                  </span>
                </div>
                <Link href="/home/profile" className="flex items-center">
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
