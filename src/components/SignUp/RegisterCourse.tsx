"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthProfileContext";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Check, Loader2, BookOpen, Languages } from "lucide-react";

type Course = {
  course_id: string;
  language: string;
  icon_url: string;
};

export default function CoursePickerPage() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("Courses")
          .select("course_id, language, icon_url")
          .order("language", { ascending: true });

        if (!cancelled) {
          if (error) {
            setError(error.message);
            setCourses([]);
          } else {
            setCourses(data ?? []);
          }
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load courses.";
        setError(msg);
        setCourses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // 2) Save selection
  async function saveSelection() {
    if (!user?.id || !selectedId) return;
    setError("");
    setSaving(true);

    try {
      console.log(selectedId);
      const { error: upErr } = await supabase
        .from("Users")
        .upsert({
          id: user.id,
          username: user.user_metadata.username,
          total_points: 0,
          current_course: selectedId,
        })
        .eq("id", user.id);

      if (upErr) throw upErr;

      const { error: ucErr } = await supabase.from("user_courses").upsert({
        user_id: user.id,
        course_id: selectedId,
        module: 0,
        stage: 0,
      });

      if (ucErr) throw ucErr;
      console.log("saved");
      await refresh();
      router.replace("/home");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save course selection.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">
              Choose your course
            </h1>
            <p className="text-sm text-muted-foreground">
              Pick a course to get started. You can change this later.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              {courses.length} available
            </Badge>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <CourseSkeletonGrid />
        ) : courses.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <CourseCard
                  key={c.course_id}
                  course={c}
                  selected={selectedId === c.course_id}
                  onSelect={() => setSelectedId(c.course_id)}
                />
              ))}
            </div>

            <Separator className="my-6" />

            <div className="flex items-center gap-3">
              <Button
                onClick={saveSelection}
                disabled={!selectedId || saving}
                className="rounded-xl"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Start learning"
                )}
              </Button>

              <span className="text-xs text-muted-foreground">
                Select a course to continue
              </span>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/* ---------------------------------- UI ---------------------------------- */

function CourseCard({
  course,
  selected,
  onSelect,
}: {
  course: Course;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      className={cn(
        "group h-full cursor-pointer rounded-2xl border transition-colors hover:bg-muted/50 focus-within:ring-2",
        selected && "ring-2 ring-primary/40",
      )}
    >
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
          <BookOpen className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{course.language}</h3>
            {selected && (
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Languages className="h-4 w-4" />
            {course.language ?? "—"}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          type="button"
          variant={selected ? "default" : "outline"}
          size="sm"
          className="w-full rounded-xl"
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {selected ? "Selected" : "Choose"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function CourseSkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="rounded-2xl">
          <CardHeader className="flex flex-row items-center gap-3 pb-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <Skeleton className="h-3 w-24" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-9 w-full rounded-xl" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
      <p className="text-sm text-muted-foreground">
        No courses available yet. Please check back later.
      </p>
    </div>
  );
}
