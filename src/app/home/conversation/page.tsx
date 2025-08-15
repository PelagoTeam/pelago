"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Conversation from "@/components/conversation/Conversation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthProfileContext";
import { ConversationType, Theme } from "@/lib/types";
import NewConversation from "@/components/conversation/NewConversation";
import ConversationSidebar from "@/components/conversation/ConversationSidebar";

export default function ConversationPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const search = useSearchParams();
  const conversationId = search.get("id") ?? undefined;

  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingThemes, setLoadingThemes] = useState(true);
  const { profile } = useAuth();

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);

    if (!profile) {
      setConversations([]);
      setLoadingConversations(false);
      return;
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("id, title")
      .eq("user_id", profile.id);

    if (!error && data) {
      setConversations(data);
    }
    setLoadingConversations(false);
  }, [supabase, profile]);

  useEffect(() => {
    const loadThemes = async () => {
      setLoadingThemes(true);
      const { data, error } = await supabase
        .from("themes")
        .select("id, title, language, starter_prompt, difficulty")
        .order("title");

      console.log("themes", data);
      if (!error && data) setThemes(data);
      setLoadingThemes(false);
    };
    loadConversations();
    loadThemes();
  }, [loadConversations, supabase]);

  function handleSelectConversation(id: string) {
    router.push(`/home/conversation?id=${id}`);
  }

  const handleDeleteConversation = async (id: string) => {
    const prev = conversations;
    setConversations((x) => x.filter((c) => c.id !== id));
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id);

    if (error) setConversations(prev);
    else if (conversationId === id) {
      const next = prev.find((c) => c.id !== id);
      router.push(
        next ? `/home/conversation?id=${next.id}` : "/home/conversation",
      );
    }
  };

  const handleNewConversation = () => {
    router.push(`/home/conversation`);
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <ConversationSidebar
        conversations={conversations}
        activeId={conversationId}
        onSelect={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {loadingConversations ? (
        <div className="flex flex-1 items-center justify-center">
          Loading...
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {conversationId ? (
            <Conversation id={conversationId} />
          ) : (
            <NewConversation
              themes={themes}
              loading={loadingThemes}
              onCreated={handleSelectConversation}
            />
          )}
        </div>
      )}
    </div>
  );
}
