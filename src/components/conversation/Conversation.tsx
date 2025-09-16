"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ChevronUpIcon,
  InfoIcon,
  PauseIcon,
  PlayIcon,
  SendIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthProfileContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Profile } from "@/lib/types";
import LiveSTT, { LiveSttState } from "./LiveSpeechToText/STT";
import { buildWsUrlFromProfile } from "@/lib/languages";
import AudioPlayer from "./LiveSpeechToText/AudioPlayer";
import { uploadRecordingAndGetUrl } from "./LiveSpeechToText/saveAudio";
import { cn } from "@/lib/utils";
import WaveAudioPlayer from "./LiveSpeechToText/AudioPlayer";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

type Conversation = {
  topic: string;
  difficulty: string;
  language: string;
  messages: Message[];
  location: string;
};

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

type LiveSTTHandle = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  retake: () => void; // clears preview/transcripts
  setDevice: (deviceId: string) => Promise<void>;
  setLang: (code: string) => void; // future streams will use this
};

type Audio = {
  blob: Blob;
  meta: {
    mime: string;
    size: number;
  };
};

export default function Conversation({
  conversation_id,
}: {
  conversation_id: string;
}) {
  const { profile, loading: authLoading } = useAuth();
  const [conversation, setConversation] = useState<Conversation | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Audio related use states
  const [usingAudio, setUsingAudio] = useState(false);
  const [recordBlob, setRecordBlob] = useState<Audio | null>(null);
  const [recordedAudioTranscribe, setRecordedAudioTranscribe] = useState<{
    text: string;
    meta: { isPartial: boolean };
  } | null>(null);
  const sttRef = useRef<LiveSTTHandle>(null);
  const stateRef = useRef<LiveSttState>("idle");

  const wsUrl = buildWsUrlFromProfile(profile);
  const url = useMemo(
    () => (recordBlob ? URL.createObjectURL(recordBlob.blob) : null),
    [recordBlob],
  );

  useEffect(() => {
    if (!profile || !conversation_id || authLoading) return;
    let disposed = false;
    const handle = setTimeout(() => {
      (async () => {
        const conv = await getConversation(conversation_id, profile);
        if (!disposed) {
          setConversation(conv);
        }
      })();
    }, 100);
    return () => {
      disposed = true;
      clearTimeout(handle);
    };
  }, [conversation_id, profile, authLoading]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const messagesRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      messagesRef.current?.scrollTo({ top: 0 });
    });
    return () => cancelAnimationFrame(raf);
  }, [conversation?.messages.length, loading]);

  async function sendFromAudio() {
    if (!recordBlob || !profile || !conversation || !recordedAudioTranscribe)
      return;

    const prevConversation = conversation;
    const prevRecordedAudioTranscribe = recordedAudioTranscribe;
    const prevBlob = recordBlob;
    const transcript = recordedAudioTranscribe.text.trim();

    setLoading(true);
    setUsingAudio(false);
    stateRef.current = "idle";

    // optimistic: add pending user message (audio)
    const supabase = createClient();
    // 1) upload and get signed/public URL
    const { audio_url } = await uploadRecordingAndGetUrl({
      supabase,
      blob: recordBlob.blob,
      userId: profile.user_id,
      conversationId: conversation_id,
    });
    const optimisticUser: Message = {
      message_id: "PLACEHOLDER_ID",
      role: "user",
      pending: true,
      content: transcript,
      audio_url: audio_url,
      remarks: "...",
    };
    const optimisticConversation: Conversation = {
      ...conversation,
      messages: [...conversation.messages, optimisticUser],
    };
    setConversation((conversation) =>
      conversation ? optimisticConversation : conversation,
    );
    setRecordedAudioTranscribe(null);
    setRecordBlob(null);

    try {
      // 2) call LLM with transcript + audioUrl
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: optimisticConversation.topic,
          username: profile.username,
          history: optimisticConversation.messages,
          conversation_id: conversation_id,
          audio_url: audio_url,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      const data = await res.json();
      if (data.error) {
        setError("An error has occurred. Please refresh and try again.");
      }

      const speech_res = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: data.native,
          userId: profile.user_id,
          conversationId: conversation_id,
          messageId: data.messageIds.assistant,
        }),
      });
      if (!speech_res.ok) {
        throw new Error(`TTS failed with status ${speech_res.status}`);
      }
      const speech_data = await speech_res.json();

      // finalize optimistic user message
      optimisticUser.remarks = data.remarks;
      optimisticUser.pending = false;
      optimisticUser.message_id = data.messageIds.user;

      const newConversation: Conversation = {
        ...optimisticConversation,
        messages: [
          ...optimisticConversation.messages,
          {
            message_id: data.messageIds.assistant,
            role: "assistant",
            pending: false,
            content:
              data.native + "\n" + data.romanization + "\n" + data.english,
            emotion: data.emotion,
            speech_url: speech_data.speech_url,
          },
        ],
      };
      setConversation((conversation) =>
        conversation ? newConversation : conversation,
      );

      // optional: clear audio/transcript states
      // setRecordBlob(null); setRecordedAudioTranscribe(null);
    } catch (e) {
      console.error("sendFromAudio failed", e);
      // rollback (simple): remove the optimistic item
      setConversation(prevConversation);
      setRecordedAudioTranscribe(prevRecordedAudioTranscribe);
      setRecordBlob(prevBlob);
      setInput(input);
    } finally {
      setLoading(false);
    }
  }

  async function sendFromText() {
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
      message_id: "PLACEHOLDER_ID",
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
          conversation_id: conversation_id,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        setError("An error has occurred. Please refresh and try again.");
      }

      const speech_res = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: data.native,
          userId: profile?.user_id,
          conversationId: conversation_id,
          messageId: data.messageIds.assistant,
        }),
      });
      if (!speech_res.ok) {
        throw new Error(`TTS failed with status ${speech_res.status}`);
      }
      const speech_data = await speech_res.json();

      optimisticUserMsg.remarks = data.remarks;
      optimisticUserMsg.pending = false;
      optimisticUserMsg.message_id = data.messageIds.user;

      const newConversation: Conversation = {
        ...optimisticConversation,
        messages: [
          ...optimisticConversation.messages,
          {
            message_id: data.messageIds.assistant,
            role: "assistant",
            pending: false,
            content:
              data.native + "\n" + data.romanization + "\n" + data.english,
            emotion: data.emotion,
            speech_url: speech_data.speech_url,
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

  async function send() {
    if (loading) return;
    setLoading(true);
    setError("");

    if (usingAudio && recordBlob) {
      await sendFromAudio();
      return;
    }
    await sendFromText();
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) send();
    }
  };

  const avatar = avatarState(conversation);

  return (
    <div
      className="flex overflow-hidden relative flex-col justify-end w-full h-full rounded-xl border"
      style={{
        backgroundImage: `url(${avatar.theme})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <img
        key={avatar.emotion}
        src={avatar.emotion}
        alt={`${avatar.emotion} avatar`}
        draggable={false}
        loading="eager"
        className="absolute inset-0 z-0 w-full h-full object-cover object-center pointer-events-none select-none transition-transform duration-300 translate-y-8"
      />
      <div
        className={cn(
          "w-full relative group transition-all z-10 flex flex-col",
          showHistory
            ? "h-5/6 bg-gradient-to-b from-background/70 to-background"
            : "h-1/4 bg-transparent",
        )}
      >
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setShowHistory((h) => !h)}
          className={cn(
            "absolute top-0 left-1/2 -translate-1/2 rounded-full bg-muted/30",
            "group-hover:opacity-100",
            showHistory ? "opacity-100 bg-muted" : "opacity-0",
          )}
        >
          <ChevronUpIcon
            strokeWidth={3}
            className={cn(
              "text-muted-foreground",
              showHistory ? "rotate-180" : "",
            )}
          />
        </Button>
        <div
          ref={messagesRef}
          className="flex overflow-y-auto flex-col-reverse gap-3 p-6 h-full no-scrollbar"
        >
          {loading && <Skeleton className="w-1/3 h-12" />}
          {[...conversation.messages].toReversed().map((message) => (
            <MessageBubble
              key={message.message_id}
              message={message}
              isLatestAssistant={
                message.message_id ===
                [...conversation.messages]
                  .toReversed()
                  .find((m) => m.role === "assistant")?.message_id
              }
            />
          ))}
        </div>
      </div>
      <div className="flex z-10 gap-3 justify-end items-center p-3 w-full border-t bg-background">
        {recordBlob && url && (
          <div className="inline-block py-2 px-4 rounded-2xl bg-primary min-w-1/2">
            <AudioPlayer src={url} height={30} />
          </div>
        )}
        {!usingAudio && (
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your message…"
            className="max-w-full h-9 resize-none min-h-9"
          />
        )}
        <LiveSTT
          setUsingAudio={setUsingAudio}
          ref={sttRef}
          stateRef={stateRef}
          wsUrl={wsUrl}
          setRecordedAudioTranscribe={setRecordedAudioTranscribe}
          onRecordingReady={(b) => setRecordBlob(b)}
          onError={(e) => console.error(e)}
        />
        {(!usingAudio || (usingAudio && recordBlob)) && (
          <Button onClick={send} disabled={loading} size="icon">
            <SendIcon className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isLatestAssistant,
}: {
  message: Message;
  isLatestAssistant: boolean;
}) {
  if (message.role === "user") {
    return <UserMessageBubble message={message} />;
  }
  if (message.role === "assistant") {
    return (
      <AssistantMessageBubble
        message={message}
        isLatestAssistant={isLatestAssistant}
      />
    );
  }
}

function UserMessageBubble({ message }: { message: UserMessage }) {
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
    <div className="flex gap-3 items-center self-end max-w-1/2">
      <HoverCard>
        <HoverCardTrigger>
          <InfoIcon
            className={`w-5 ${message.pending ? "animate-pulse" : ""}`}
          />
        </HoverCardTrigger>
        <HoverCardContent
          align="start"
          side="left"
          className="max-w-xs whitespace-pre-wrap"
        >
          {message.remarks || "No remarks"}
        </HoverCardContent>
      </HoverCard>
      {message.audio_url ? (
        <div className="p-4 rounded-lg bg-primary">
          {url ? (
            <WaveAudioPlayer src={url} height={30} />
          ) : (
            <div className="h-9 rounded animate-pulse w-[320px] bg-muted" />
          )}
        </div>
      ) : (
        <div className="py-2 px-3 rounded-lg bg-muted">
          <p className="font-medium">{message.content}</p>
        </div>
      )}
    </div>
  );
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

  const [showRomanization, setShowRomanization] = useState(false);
  const [showEnglish, setShowEnglish] = useState(false);

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

  const { native, romanization, english } = useMemo(() => {
    const parts =
      typeof message.content === "string"
        ? message.content.split("\n").map((s) => s.trim())
        : [];
    // Fallbacks to avoid runtime surprises
    return {
      native: parts[0] || message.content || "",
      romanization: parts[1] || "",
      english: parts[2] || "",
    };
  }, [message.content]);

  useEffect(() => {
    setShowRomanization(false);
    setShowEnglish(false);
  }, [message.message_id]);

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

  const handleShowHint = () => {
    if (!showRomanization && romanization) setShowRomanization(true);
    else if (!showEnglish && english) setShowEnglish(true);
  };

  const hasAnyHints = Boolean(romanization || english);
  const allHintsShown =
    (!romanization || showRomanization) && (!english || showEnglish);

  return (
    <div className="flex flex-col gap-2 text-left">
      <audio ref={audioRef} preload="auto" className="hidden" />

      <div className="py-2 px-3 rounded-lg bg-background max-w-1/2">
        <p className="font-medium whitespace-pre-wrap">{native}</p>
        {/* Hints panel (appears only when revealed) */}
        {(showRomanization || showEnglish) && (
          <div className="rounded-lg border bg-card p-3 space-y-1">
            {showRomanization && romanization && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Romanization
                </div>
                <div className="text-sm">{romanization}</div>
              </div>
            )}
            {showEnglish && english && (
              <div className="pt-2 border-t">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  English
                </div>
                <div className="text-sm">{english}</div>
              </div>
            )}
          </div>
        )}
      </div>
      {hasAnyHints && (
        <div className="flex items-center gap-2">
          {!allHintsShown ? (
            <Button
              onClick={handleShowHint}
              variant="secondary"
              className="py-1 px-2 text-xs rounded bg-muted hover:bg-muted/80"
              aria-label={
                !showRomanization
                  ? "Show romanization hint"
                  : "Show English translation"
              }
            >
              {!showRomanization ? "Show hint" : "Show translation"}
            </Button>
          ) : (
            <Button
              onClick={() => {
                setShowRomanization(false);
                setShowEnglish(false);
              }}
              variant="secondary"
              className="py-1 px-2 text-xs rounded"
              aria-label="Hide hints"
            >
              Hide hints
            </Button>
          )}
        </div>
      )}

      {signedUrl && (
        <div className="flex gap-2 items-center">
          <Button
            onClick={handlePlay}
            variant={"secondary"}
            className="py-1 px-2 text-xs rounded bg-muted hover:bg-muted/80"
            aria-label="Play assistant audio"
          >
            <PlayIcon fill="black" /> play
          </Button>
          <Button
            onClick={handlePause}
            variant={"secondary"}
            className="py-1 px-2 text-xs rounded bg-muted hover:bg-muted/80"
            aria-label="Pause assistant audio"
          >
            <PauseIcon fill="black" /> pause
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

const GIFS = {
  neutral: "/avatar/neutral.gif",

  happy: "/avatar/happy.gif",
  sad: "/avatar/happy.gif",
  angry: "/avatar/happy.gif",
  speaking: "/avatar/happy.gif",

  confused: "/avatar/confused.gif",
  surprised: "/avatar/confused.gif",

  curious: "/avatar/curious.gif",
  thinking: "/avatar/curious.gif",
  interested: "/avatar/curious.gif",
};

const THEMES = {
  mall: "/theme/mall.png",
  market: "/theme/market.png",
  restaurant: "/theme/restaurant.png",
  temple: "/theme/temple.png",
};

function avatarState(conversation: Conversation) {
  const location = conversation.location.toLowerCase().trim();
  const emotion = conversation.messages
    .filter((msg) => msg.role === "assistant")
    .at(-1)
    ?.emotion?.toLowerCase()
    .trim();

  return {
    theme: THEMES[location as keyof typeof THEMES] ?? THEMES.mall,
    emotion: GIFS[emotion as keyof typeof GIFS] ?? GIFS.neutral,
  };
}

async function getConversation(
  conversation_id: string,
  profile: Profile,
): Promise<Conversation> {
  const supabase = createClient();
  const { data: messages, error } = await supabase
    .from("messages")
    .select(
      "message_id, role, content, remarks, audio_url, emotion, speech_url",
    )
    .eq("conversation_id", conversation_id)
    .eq("user_id", profile.user_id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const { data: conversation, error: e } = (await supabase
    .from("conversations")
    .select("title, difficulty, language, themes(location)")
    .eq("user_id", profile.user_id)
    .eq("language", profile.language)
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: true })
    .single()) as {
    data: {
      title: string;
      difficulty: string;
      language: string;
      themes: { location: string };
    };
    error: Error | null;
  };

  if (e) throw e;
  return {
    topic: conversation.title,
    difficulty: conversation.difficulty,
    language: conversation.language,
    location: conversation.themes.location,
    messages: messages.map((message) => ({
      message_id: message.message_id,
      role: message.role,
      content: message.content,
      remarks: message.remarks,
      audio_url: message.audio_url,
      emotion: message.emotion,
      speech_url: message.speech_url,
      pending: false,
    })),
  };
}
