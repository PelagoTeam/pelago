"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { InfoIcon, SendIcon } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthProfileContext";

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
  const { profile } = useAuth();

  useEffect(() => {
    let running = false;
    (async () => {
      if (!running) {
        running = true;
        const conversation = await getConversation(id);
        console.log("conversation", conversation);
        setConversation(conversation);
      }
    })();
    return () => {
      running = true;
    };
  }, [id]);

  if (!conversation) {
    // TODO: loading state
    return <div>loading...</div>;
  }

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

    // Hardcoded UUIDs
    const userMsgId = "20f97e2f-bf29-4bbb-accb-9001ebdf8620";
    const assistantMsgId = "7325ab2e-1272-4503-bf12-ed206f925f3d";

    // Optimistic messages
    const optimisticUserMsg: Message = {
      id: userMsgId,
      role: "user",
      pending: true,
      content: input,
      remarks: "...", // placeholder while waiting for real remarks
    };
    const optimisticAssistantMsg: Message = {
      id: assistantMsgId,
      role: "assistant",
      pending: true,
      content: "...", // placeholder while waiting for real reply
    };

    // 1) Optimistically add messages to conversation
    setConversation((c) => {
      if (!c) return c;
      return {
        ...c,
        messages: [...c.messages, optimisticUserMsg, optimisticAssistantMsg],
      };
    });

    // Clear input optimistically
    setInput("");
    const body = {
      theme: conversation.topic,
      username: profile?.username ?? "",
      history: conversation.messages,
    };

    try {
      // TODO: send message to AI, get reply (conversation agent) and get remarks on reply (teacher agent)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }

      const data = await res.json();

      // 2) On success: replace the optimistic assistant message with the real reply.
      // Optionally attach remarks to the user message if returned by the server.
      setConversation((c) => {
        if (!c) return c;
        return {
          ...c,
          messages: c.messages.map((m) => {
            if (m.id === assistantMsgId) {
              const am = m as AssistantMessage;
              return {
                ...am,
                pending: false,
                content:
                  data.native + "\n" + data.romanization + "\n" + data.english,
              };
            }
            if (m.id === userMsgId) {
              const um = m as UserMessage;
              return {
                ...um,
                pending: false,
                remarks: data.remarks,
              };
            }
            return m;
          }),
        };
      });
    } catch (e) {
      console.error("Send failed:", e);

      // 3) Rollback: restore previous conversation and input
      setConversation(prevConversation);
      setInput(prevInput);

      // Optionally: surface error to the user (toast / error state)
      // setError?.("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>
          Conversation •{" "}
          <span className="font-normal text-muted-foreground">
            {conversation.topic}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="overflow-y-auto pr-2 space-y-3 max-h-[50vh]">
          {conversation.messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
        <Separator />
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
      <div className="inline-block py-2 px-4 rounded-2xl bg-muted whitespace-pre-wrap">
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

async function getConversation(id: string): Promise<Conversation> {
  const supabase = createClient();
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, role, content")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false });
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
      pending: false,
    })),
  };
}
