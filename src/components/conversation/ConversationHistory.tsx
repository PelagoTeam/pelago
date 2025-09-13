import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InfoIcon, Pause, Play } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useEffect, useRef, useState } from "react";
import WaveAudioPlayer from "./LiveSpeechToText/AudioPlayer";
import { Button } from "../ui/button";

type Message = UserMessage | AssistantMessage;

type UserMessage = {
  message_id: string;
  role: "user";
  pending: boolean;
  content: string;
  remarks: string;
  audio_url?: string;
};

type AssistantMessage = {
  message_id: string;
  role: "assistant";
  pending: boolean;
  content: string;
  emotion: string;
  speech_url?: string;
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

  const lastAssistantId = [...(conversation?.messages ?? [])]
    .reverse()
    .find((m) => m.role === "assistant")?.message_id;

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
            <MessageBubble
              key={message.message_id}
              message={message}
              isLatestAssistant={
                message.role === "assistant" &&
                message.message_id === lastAssistantId
              }
            />
          ))}
          {loading && (
            <AssistantMessageBubble
              message={{
                message_id: "XXX",
                role: "assistant",
                content: "...",
                pending: true,
                emotion: "...",
                speech_url: "",
              }}
              isLatestAssistant={false}
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

function MessageBubble({
  message,
  isLatestAssistant,
}: {
  message: Message;
  isLatestAssistant: boolean;
}) {
  if (message.role === "assistant") {
    return (
      <AssistantMessageBubble
        message={message}
        isLatestAssistant={isLatestAssistant}
      />
    );
  } else if (message.role === "user") {
    return <UserMessageBubble message={message} />;
  }
}

function AssistantMessageBubble({
  message,
  isLatestAssistant,
}: {
  message: AssistantMessage;
  isLatestAssistant: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const attemptedAutoRef = useRef<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      const el = document.createElement("audio");
      el.preload = "auto";
      el.className = "hidden";
      document.body.appendChild(el);
      audioRef.current = el;
    }
    return () => {};
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const path = message.speech_url;
      if (!path) return setSignedUrl(null);

      try {
        const res = await fetch(
          `/api/tts/sign?path=${encodeURIComponent(path)}`,
        );
        const json = await res.json();
        if (!cancelled) setSignedUrl(json?.url ?? null);
      } catch {
        if (!cancelled) setSignedUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [message.speech_url]);

  useEffect(() => {
    const url = signedUrl;
    const el = audioRef.current;
    if (!url || !el) return;

    el.pause();
    el.src = url;
    el.load();
    setErr(null);

    if (isLatestAssistant && !attemptedAutoRef.current[message.message_id]) {
      attemptedAutoRef.current[message.message_id] = true;
      el.currentTime = 0;
      el.play().catch((e) => {
        setErr(e?.message || "Autoplay blocked");
      });
    }
  }, [isLatestAssistant, message.message_id, message.speech_url, signedUrl]);

  const handlePlay = async () => {
    const el = audioRef.current;
    if (!el || !signedUrl) return;
    try {
      if (el.src !== signedUrl) {
        el.src = signedUrl;
        el.load();
      }
      el.currentTime = 0;
      await el.play();
      setErr(null);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setErr(e.message);
      } else if (typeof e === "string") {
        setErr(e);
      } else {
        setErr("Could not play");
      }
    }
  };

  const handlePause = () => {
    audioRef.current?.pause();
  };

  return (
    <div className="text-left flex flex-col gap-2">
      <div className="inline-block py-2 px-4 whitespace-pre-wrap rounded-2xl bg-muted">
        {message.content}
      </div>

      {signedUrl && (
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePlay}
            variant={"secondary"}
            className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80"
            aria-label="Play assistant audio"
          >
            <Play fill="black" /> play
          </Button>
          <Button
            onClick={handlePause}
            variant={"secondary"}
            className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80"
            aria-label="Pause assistant audio"
          >
            <Pause fill="black" /> pause
          </Button>
          {err && (
            <span className="text-xs text-muted-foreground">
              {isLatestAssistant ? "(autoplay blocked — tap play)" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function UserMessageBubble({ message }: { message: UserMessage }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!message.audio_url) return setUrl(null);
      if (/^https?:\/\//i.test(message.audio_url)) {
        setUrl(message.audio_url);
        return;
      }
      const res = await fetch(
        `/api/audio/sign?path=${encodeURIComponent(message.audio_url)}`,
      );
      const json = await res.json();
      if (cancelled) return;
      setUrl(json?.url ?? null);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [message.audio_url]);

  return (
    <div className="flex gap-3 justify-end items-center">
      <HoverCard>
        <HoverCardTrigger>
          <InfoIcon
            className={`w-5 ${message.pending ? "animate-pulse" : ""}`}
          />
        </HoverCardTrigger>
        <HoverCardContent className="max-w-xs whitespace-pre-wrap">
          {message.remarks || "No remarks"}
        </HoverCardContent>
      </HoverCard>

      {message.audio_url ? (
        url ? (
          <div className="inline-block py-2 px-4 rounded-2xl bg-primary w-1/2">
            <WaveAudioPlayer src={url} height={30} />
          </div>
        ) : (
          <div className="h-9 w-[320px] animate-pulse rounded bg-muted" />
        )
      ) : (
        <div className="inline-block py-2 px-4 text-right rounded-2xl bg-primary text-primary-foreground">
          {message.content}
        </div>
      )}
    </div>
  );
}
