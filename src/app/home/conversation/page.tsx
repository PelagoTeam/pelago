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
  const conversationId = search.get("id") ?? null;

  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(true);
  const { profile } = useAuth();

  const loadConversations = useCallback(async () => {
    if (!profile) {
      setConversations([]);
      return;
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("conversation_id, title")
      .eq("user_id", profile.user_id)
      .eq("language", profile.language);
    if (!error && data) {
      setConversations(data);
    }
  }, [supabase, profile]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const loadThemes = async () => {
      if (!profile) return;
      setLoadingThemes(true);
      const { data, error } = await supabase
        .from("themes")
        .select("theme_id, title, language, prompt, difficulty")
        .eq("language", profile?.language)
        .order("title");

      console.log("themes", data);
      if (!error && data) setThemes(data);
      setLoadingThemes(false);
    };
    loadThemes();
  }, [profile, supabase]);

  function handleSelectConversation(conversation_id: string) {
    router.push(`/home/conversation?id=${conversation_id}`);
  }

  const handleDeleteConversation = async (conversation_id: string) => {
    const prev = conversations;
    setConversations((x) =>
      x.filter((c) => c.conversation_id !== conversation_id),
    );
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("conversation_id", conversation_id);

    if (error) setConversations(prev);
    else if (conversationId === conversation_id) {
      const next = prev.find((c) => c.conversation_id !== conversation_id);
      router.push(
        next
          ? `/home/conversation?id=${next.conversation_id}`
          : "/home/conversation",
      );
    }
  };

  const handleNewConversation = () => {
    router.push(`/home/conversation`);
  };

  return (
    <div className="flex gap-3 px-3 h-full">
      <ConversationSidebar
        conversations={conversations}
        onSelect={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <div className="flex-1 min-h-0">
        {conversationId ? (
          <Conversation key={conversationId} conversation_id={conversationId} />
        ) : (
          <NewConversation
            key="new"
            themes={themes}
            loading={loadingThemes}
            onCreated={handleSelectConversation}
          />
        )}
      </div>
    </div>
  );
}
