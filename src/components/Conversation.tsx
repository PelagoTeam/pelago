"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { InfoIcon, SendIcon } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

type Conversation = {
  topic: string;
  messages: Message[];
};

type Message =
  | {
      id: string;
      role: "user";
      content: string;
      remarks: string;
    }
  | {
      id: string;
      role: "assistant";
      content: string;
    };

export default function Conversation({ id }: { id: string }) {
  const [conversation, setConversation] = useState<Conversation | undefined>();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let running = false;
    (async () => {
      if (!running) {
        running = true;
        const conversation = await getConversation(id);
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

    // Hardcoded UUIDs (as requested)
    const userMsgId = "20f97e2f-bf29-4bbb-accb-9001ebdf8620";
    const assistantMsgId = "7325ab2e-1272-4503-bf12-ed206f925f3d";

    // Optimistic messages
    const optimisticUserMsg = {
      id: userMsgId,
      role: "user",
      content: input,
      // Optional UI flags
      sending: false,
    };
    const optimisticAssistantMsg = {
      id: assistantMsgId,
      role: "assistant",
      content: "...", // placeholder while waiting for real reply
      sending: true,
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

    const body = { topic: conversation.topic, message: prevInput };

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
              return {
                id: data.assistantId || assistantMsgId,
                role: "assistant",
                content: data.reply,
                sending: false,
              };
            }
            if (m.id === userMsgId) {
              return {
                ...m,
                remarks: data.remarks ?? m.remarks,
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
    return <AssistantMessageBubble content={message.content} />;
  } else if (message.role === "user") {
    return (
      <UserMessageBubble content={message.content} remarks={message.remarks} />
    );
  }
}

function AssistantMessageBubble({ content }: { content: string }) {
  return (
    <div className="text-left">
      <div className="inline-block py-2 px-4 rounded-2xl bg-muted">
        {content}
      </div>
    </div>
  );
}

function UserMessageBubble({
  content,
  remarks,
}: {
  content: string;
  remarks: string;
}) {
  return (
    <div className="flex gap-3 justify-end items-center">
      <HoverCard>
        <HoverCardTrigger>
          <InfoIcon className="w-5" />
        </HoverCardTrigger>
        <HoverCardContent>{remarks}</HoverCardContent>
      </HoverCard>
      <div className="inline-block py-2 px-4 text-right rounded-2xl bg-primary text-primary-foreground">
        {content}
      </div>
    </div>
  );
}

async function getConversation(id: string): Promise<Conversation> {
  // TODO: get conversation by id from db
  return {
    topic: "Haggling at a market",
    messages: [
      {
        id: "ea88275c-8a9f-4c90-8cfe-c1463adfb88c",
        role: "assistant",
        content:
          "Sawasdee! You're at a Bangkok market. Try greeting the vendor and ask for the price.",
      },
    ],
  };
}
