"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { InfoIcon, SendIcon } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthProfileContext";
import { Skeleton } from "@/components/ui/skeleton";

type Conversation = {
  topic: string;
  difficulty: string;
  language: string;
  messages: Message[];
};

type Message = UserMessage | AssistantMessage;

type UserMessage = {
  id: string;
  role: "user";
  pending: boolean;
  content: string;
  remarks: string;
};

type AssistantMessage = {
  id: string;
  role: "assistant";
  pending: boolean;
  content: string;
};

export default function Conversation({ id }: { id: string }) {
  const [conversation, setConversation] = useState<Conversation | undefined>();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();

  useEffect(() => {
    let running = false;
    (async () => {
      if (!running && profile) {
        running = true;
        const conversation = await getConversation(id, profile.id);
        console.log("conversation", conversation);
        setConversation(conversation);
      }
    })();
    return () => {
      running = true;
    };
  }, [id, profile]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [conversation?.messages.length, loading]);

  async function send() {
    if (!input.trim()) {
      return;
    }
    if (!conversation) {
      return;
    }

    // Save previous state so we can rollback on error
    const prevConversation = conversation;
    const prevInput = input;

    setLoading(true);

    // Optimistic state
    const optimisticUserMsg: Message = {
      id: "PLACEHOLDER_ID",
      role: "user",
      pending: true,
      content: input,
      remarks: "...", // placeholder while waiting for real remarks
    };
    const optimisticConversation: Conversation = {
      ...conversation,
      messages: [...conversation.messages, optimisticUserMsg],
    };

    // set state optimistically
    setConversation((conversation) =>
      conversation ? optimisticConversation : conversation,
    );
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: optimisticConversation.topic,
          username: profile?.username,
          history: optimisticConversation.messages,
          conversation_id: id,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        setError("An error has occurred. Please refresh and try again.");
      }

      optimisticUserMsg.remarks = data.remarks;
      optimisticUserMsg.pending = false;
      optimisticUserMsg.id = data.messageIds.user;

      const newConversation: Conversation = {
        ...optimisticConversation,
        messages: [
          ...optimisticConversation.messages,
          {
            id: data.messageIds.assistant,
            role: "assistant",
            pending: false,
            content:
              data.native + "\n" + data.romanization + "\n" + data.english,
          },
        ],
      };

      setConversation((conversation) =>
        conversation ? newConversation : conversation,
      );
    } catch (e) {
      console.error("Send failed:", e);

      // 3) Rollback: restore previous conversation and input
      setConversation(prevConversation);
      setInput(prevInput);

      // Optionally: surface error to the user (toast / error state)l
      // setError?.("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!conversation) {
    return (
      <Card className="flex flex-col w-full h-full">
        <CardHeader>
          <CardTitle className="flex gap-1 items-center">
            <span>Conversation • </span>
            <Skeleton className="h-[1.5rem] w-[6rem]" />
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 gap-3 min-h-0">
          <div className="flex overflow-y-scroll flex-col flex-1 gap-3 min-h-0 no-scrollbar">
            <Skeleton className="h-10 w-xl" />
            <Skeleton className="self-end h-10 w-lg" />
            <Skeleton className="h-10 w-md" />
          </div>

          <Separator />

          <div className="flex gap-3">
            <Textarea
              disabled={true}
              placeholder="Type your message…"
              className="max-w-full h-9 resize-none min-h-9"
            />
            <Button disabled={true} size="icon">
              <SendIcon />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col w-full h-full">
      <CardHeader>
        <CardTitle>
          Conversation •{" "}
          <span className="font-normal text-muted-foreground">
            {conversation.topic}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-3 min-h-0">
        <div className="flex overflow-y-scroll flex-col flex-1 gap-3 min-h-0 no-scrollbar">
          {conversation.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {loading && (
            <AssistantMessageBubble
              message={{
                id: "XXX",
                role: "assistant",
                content: "...",
                pending: true,
              }}
            />
          )}
        </div>

        <Separator />

        {error && <p className="text-red-600">{error}</p>}

        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!loading && input.trim()) send();
              }
            }}
            placeholder="Type your message…"
            className="max-w-full h-9 resize-none min-h-9"
          />
          <Button onClick={send} disabled={loading} size="icon">
            <SendIcon />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "assistant") {
    return <AssistantMessageBubble message={message} />;
  } else if (message.role === "user") {
    return <UserMessageBubble message={message} />;
  }
}

function AssistantMessageBubble({ message }: { message: AssistantMessage }) {
  return (
    <div className="text-left">
      <div className="inline-block py-2 px-4 whitespace-pre-wrap rounded-2xl bg-muted">
        {message.content}
      </div>
    </div>
  );
}

function UserMessageBubble({ message }: { message: UserMessage }) {
  return (
    <div className="flex gap-3 justify-end items-center">
      <HoverCard>
        <HoverCardTrigger>
          <InfoIcon
            className={cn("w-5", message.pending ? "animate-pulse" : "")}
          />
        </HoverCardTrigger>
        <HoverCardContent>{message.remarks}</HoverCardContent>
      </HoverCard>
      <div className="inline-block py-2 px-4 text-right rounded-2xl bg-primary text-primary-foreground">
        {message.content}
      </div>
    </div>
  );
}

async function getConversation(
  id: string,
  user_id: string,
): Promise<Conversation> {
  const supabase = createClient();
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, role, content, remarks")
    .eq("conversation_id", id)
    .eq("user_id", user_id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const { data: conversation, error: e } = await supabase
    .from("conversations")
    .select("title, difficulty, language")
    .eq("id", id)
    .single();
  if (e) throw e;
  return {
    topic: conversation.title,
    difficulty: conversation.difficulty,
    language: conversation.language,
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      remarks: message.remarks,
      pending: false,
    })),
  };
}
