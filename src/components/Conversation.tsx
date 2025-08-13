"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

export default function Conversation() {
  const [topic, setTopic] = useState("Haggling at a market");
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "Sawasdee! You're at a Bangkok market. Try greeting the vendor and ask for the price.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    setLoading(true);
    const body = { topic, message: input };
    setMsgs((m) => [...m, { role: "user", content: input }]);
    setInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "(Mock) Try saying: 'Khop khun krub/ka, can give discount?'.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>
          Conversation •{" "}
          <span className="font-normal text-muted-foreground">{topic}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-y-auto pr-2 space-y-3 max-h-[50vh]">
          {msgs.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} />
          ))}
        </div>
        <Separator />
        <div className="flex gap-3 items-center">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message…"
            className="min-h-[60px]"
          />
          <Button onClick={send} disabled={loading}>
            {loading ? "Thinking…" : "Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MessageBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  if (role === "assistant") {
    return <AssistantMessageBubble content={content} />;
  } else if (role === "user") {
    return <UserMessageBubble content={content} remarks="" />;
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
  const [teacher, setTeacher] = useState<string | undefined>();
  useEffect(() => {
    const timer = setTimeout(() => {
      setTeacher(
        `${content} is not a good reply, you should instead try something else`,
      );
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="flex gap-3 justify-end items-center">
      <HoverCard>
        <HoverCardTrigger>
          <InfoIcon className={cn("w-5", teacher ?? "animate-pulse")} />
        </HoverCardTrigger>
        <HoverCardContent>{teacher}</HoverCardContent>
      </HoverCard>
      <div className="inline-block py-2 px-4 text-right rounded-2xl bg-primary text-primary-foreground">
        {content}
      </div>
    </div>
  );
}
