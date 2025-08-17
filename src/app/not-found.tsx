import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-[70vh] items-center justify-center px-4">
      {/* soft blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 -left-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-12 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            404
          </span>
          <div>
            <h1 className="text-lg font-semibold">Page not found</h1>
            <p className="text-sm text-muted-foreground">
              The page you{"'"}re looking for doesn{"'"}t exist or has moved.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:flex">
          <Button asChild className="rounded-xl">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Link>
          </Button>
        </div>

        <div className="mt-6 rounded-xl border bg-background p-4">
          <p className="text-xs text-muted-foreground">
            Tip: Check the URL or navigate using the buttons above.
          </p>
        </div>
      </div>
    </main>
  );
}
