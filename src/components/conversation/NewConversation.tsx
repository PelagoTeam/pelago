import { useAuth } from "@/contexts/AuthProfileContext";
import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Theme } from "@/lib/types";
import { Loader2, Plus } from "lucide-react";
import { Separator } from "@radix-ui/react-separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NewConversation({
  themes,
  loading,
  onCreated,
}: {
  themes: Theme[];
  loading: boolean;
  onCreated: (conversation_id: string) => void;
}) {
  const [themeId, setThemeId] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  const createWithOpener = useCallback(async () => {
    if (!themeId) return;
    setCreating(true);

    if (!profile) {
      setCreating(false);
      return;
    }

    try {
      const res = await fetch(`/api/theme`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ themeId: themeId, username: profile.username }),
      });

      if (!res.ok) {
        setError("An error occurred. Please refresh and try again.");
      }

      const data = await res.json();

      onCreated(data.conversation_id);
    } catch (err) {
      console.error("error generating text", err);
    } finally {
      setCreating(false);
    }
  }, [themeId, onCreated, profile]);

  return (
    <div className="flex h-auto justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Start a new chat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading themes…
            </div>
          ) : (
            <>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>
                    Choose a theme to generate a context-aware opener. You can
                    change topics anytime.
                  </span>
                </div>
              </CardHeader>
              <div
                role="radiogroup"
                aria-label="Theme"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {themes.map((t) => {
                  const active = t.theme_id === themeId;
                  return (
                    <button
                      key={t.theme_id}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setThemeId(t.theme_id)}
                      className={cn(
                        "group relative w-full rounded-2xl border bg-card p-4 text-left transition-all",
                        "hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring/40",
                        active
                          ? "border-primary/60 ring-1 ring-primary/40 shadow-sm"
                          : "border-border",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium leading-none">
                              {t.title}
                            </h4>
                          </div>
                        </div>
                      </div>
                      <div className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity opacity-0 group-hover:opacity-100 bg-gradient-to-t from-primary/5 to-transparent" />
                    </button>
                  );
                })}
                <button
                  key={"new"}
                  role="radio"
                  disabled
                  aria-checked={false}
                  className="group relative w-full rounded-2xl border bg-card p-4 text-left transition-all opacity-50 focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium leading-none">
                          Coming Soon
                        </h4>
                      </div>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity opacity-0 group-hover:opacity-100 bg-gradient-to-t from-primary/5 to-transparent" />
                </button>
              </div>
              <Separator />
              <div className="flex items-center justify-end gap-3">
                <Button
                  onClick={createWithOpener}
                  disabled={!themeId || creating}
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Creating…
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" /> Create chat
                    </>
                  )}
                </Button>
              </div>
              {error && <p className="text-red-500">{error}</p>}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
