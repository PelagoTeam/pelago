import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InfoIcon } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useEffect, useRef } from "react";

type Message = UserMessage | AssistantMessage;

type UserMessage = {
  message_id: string;
  role: "user";
  pending: boolean;
  content: string;
  remarks: string;
};

type AssistantMessage = {
  message_id: string;
  role: "assistant";
  pending: boolean;
  content: string;
};

type Conversation = {
  topic: string;
  difficulty: string;
  language: string;
  messages: Message[];
};

export default function ConversationHistory({
  conversation,
  loading,
  error,
}: {
  conversation: Conversation;
  loading: boolean;
  error: string;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const hasScrolledOnce = useRef(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: hasScrolledOnce.current ? "smooth" : "auto",
        block: "end",
      });
      hasScrolledOnce.current = true;
    });
    return () => cancelAnimationFrame(raf);
  }, [conversation?.messages.length, loading]);

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
            <MessageBubble key={message.message_id} message={message} />
          ))}
          {loading && (
            <AssistantMessageBubble
              message={{
                message_id: "XXX",
                role: "assistant",
                content: "...",
                pending: true,
              }}
            />
          )}
          <div ref={bottomRef} className="h-0" />
        </div>

        <Separator />

        {error && <p className="text-red-600">{error}</p>}
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
            className={`w-5 ${message.pending ? "animate-pulse" : ""}`}
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
