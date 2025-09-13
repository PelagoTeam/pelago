"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { SendIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthProfileContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Profile } from "@/lib/types";
import ConversationHistory from "./ConversationHistory";
import LiveSTT from "./LiveSpeechToText/STT";
import { buildWsUrlFromProfile } from "@/lib/languages";
import AudioPlayer from "./LiveSpeechToText/AudioPlayer";
import { uploadRecordingAndGetUrl } from "./LiveSpeechToText/saveAudio";
import Avatar from "@/components/conversation/Avatar";

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

  const { profile, loading: authLoading } = useAuth();

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

  async function sendFromAudio() {
    if (!recordBlob || !profile || !conversation || !recordedAudioTranscribe)
      return;

    const prevConversation = conversation;
    const prevRecordedAudioTranscribe = recordedAudioTranscribe;
    const prevBlob = recordBlob;
    const transcript = recordedAudioTranscribe.text.trim();

    setLoading(true);

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

  const handleShowHistory = () => {
    setShowHistory(!showHistory);
  };

  const wsUrl = buildWsUrlFromProfile(profile);
  const url = useMemo(
    () => (recordBlob ? URL.createObjectURL(recordBlob.blob) : null),
    [recordBlob],
  );

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  function isAssistantMessage(m: Message): m is AssistantMessage {
    return m.role === "assistant";
  }

  function lastAssistantEmotion(messages: Message[]): string {
    // Walk backwards so we don’t care if the last msg is from the user
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (isAssistantMessage(m)) return m.emotion ?? "neutral";
    }
    return "neutral";
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

  return (
    <div className="relative h-full w-full rounded-xl border bg-background shadow-sm">
      <div className="absolute right-3 top-3 z-10">
        <Button variant="outline" onClick={handleShowHistory}>
          View History
        </Button>
      </div>

      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-auto p-4">
          <div className="h-full sticky top-4">
            <Avatar
              emotion={lastAssistantEmotion(conversation?.messages ?? [])}
              theme={conversation.location}
            />
          </div>
        </div>
        <div className="sticky bottom-0 w-full bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/50 border-t">
          <div className="p-3">
            <div className="flex items-center gap-3 justify-end">
              {recordBlob && url && (
                <div className="inline-block py-2 px-4 rounded-2xl bg-primary min-w-1/2">
                  <AudioPlayer src={url} height={30} />
                </div>
              )}
              {!usingAudio && (
                <Textarea
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Type your message…"
                  className="max-w-full h-9 min-h-9 resize-none"
                />
              )}
              <LiveSTT
                setUsingAudio={setUsingAudio}
                ref={sttRef}
                wsUrl={wsUrl}
                setRecordedAudioTranscribe={setRecordedAudioTranscribe}
                onRecordingReady={(b) => setRecordBlob(b)}
                onError={(e) => console.error(e)}
              />
              {(!usingAudio || (usingAudio && recordBlob)) && (
                <Button onClick={send} disabled={loading} size="icon">
                  <SendIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`${showHistory ? "block" : "hidden"} absolute top-12 right-3 w-[28rem] z-20 bg-background border rounded-xl shadow-lg overflow-hidden`}
      >
        <div className="h-[80vh] overflow-y-auto p-3">
          <ConversationHistory
            conversation={conversation}
            error={error}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
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
