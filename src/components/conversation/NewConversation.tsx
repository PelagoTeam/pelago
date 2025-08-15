import { useAuth } from "@/contexts/AuthProfileContext";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Theme } from "@/lib/types";
import { Loader2, Plus } from "lucide-react";
import { Separator } from "@radix-ui/react-separator";
import { Button } from "@/components/ui/button";

export default function NewConversation({
  themes,
  loading,
  onCreated,
}: {
  themes: Theme[];
  loading: boolean;
  onCreated: (id: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [themeId, setThemeId] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const { profile } = useAuth();

  const createWithOpener = useCallback(async () => {
    if (!themeId) return;
    setCreating(true);

    if (!profile) {
      setCreating(false);
      return;
    }

    const { data: theme } = await supabase
      .from("themes")
      .select("id, title, language, starter_prompt")
      .eq("id", themeId)
      .single();
    if (!theme) {
      setCreating(false);
      return;
    }
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .insert({
        user_id: profile.id,
        theme_id: theme.id,
        title: theme.title,
      })
      .select("id")
      .single();

    console.log("conversation created");

    if (convErr || !conv?.id) {
      setCreating(false);
      return;
    }

    try {
      const res = await fetch(`/api/theme`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: theme.starter_prompt }),
      });
      const data = await res.json();
      const starting_text = data.text;
      console.log("text generted");

      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: conv.id,
        role: "assistant",
        content: starting_text,
        user_id: profile.id,
      });
      console.log("message saved");
      if (msgErr) {
        setCreating(false);
        console.error("error saving message", msgErr);
        return;
      }
    } catch (err) {
      console.error("error generating text", err);
    }

    setCreating(false);
    onCreated(conv.id);
  }, [themeId, supabase, onCreated, profile]);

  return (
    <div className="flex h-full items-center justify-center p-6">
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
              <div className="text-sm text-muted-foreground">
                Choose a theme to generate a context-aware opener. You can
                change topics anytime.
              </div>
              <Select onValueChange={(v) => setThemeId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                  {themes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
