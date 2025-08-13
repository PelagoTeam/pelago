"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Rocket, BellRing } from "lucide-react";

export default function ComingSoon() {
  return (
    <main className="relative grid min-h-[80vh] place-items-center overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-28 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />

      <section className="relative mx-auto w-full max-w-3xl rounded-2xl border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className="animate-[pulse_3s_ease-in-out_infinite]"
          >
            Coming soon
          </Badge>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            We are polishing the last bits
          </div>
        </div>

        <div className="mt-6 grid items-center gap-6 sm:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Something new is on the way
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              We are building this feature to make your learning smoother,
              smarter, and more fun. Want a ping the moment it launches?
            </p>

            <form className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  aria-label="Email for launch notification"
                />
              </div>
              <Button type="submit" className="whitespace-nowrap">
                <BellRing className="mr-2 h-4 w-4" />
                Notify me
              </Button>
            </form>
          </div>

          <div className="relative mx-auto grid place-items-center">
            <div className="relative h-40 w-40 sm:h-48 sm:w-48">
              <div className="absolute inset-0 grid place-items-center rounded-full bg-primary/10">
                <Rocket className="h-8 w-8 text-primary animate-[float_6s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <ul className="grid gap-3 sm:grid-cols-3 text-sm">
          <li className="rounded-lg border bg-muted/30 p-3">
            <span className="font-medium">Smarter quizzes</span>
            <p className="text-muted-foreground">
              Adaptive practice that meets you where you are.
            </p>
          </li>
          <li className="rounded-lg border bg-muted/30 p-3">
            <span className="font-medium">Faster feedback</span>
            <p className="text-muted-foreground">
              Hints and tips right when you need them.
            </p>
          </li>
          <li className="rounded-lg border bg-muted/30 p-3">
            <span className="font-medium">Beautiful UI</span>
            <p className="text-muted-foreground">
              A clean, focused experience across devices.
            </p>
          </li>
        </ul>
      </section>
    </main>
  );
}
