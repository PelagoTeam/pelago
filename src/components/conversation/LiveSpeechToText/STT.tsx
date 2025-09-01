import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// -------- Types
export type LiveSttState =
  | "idle"
  | "requesting"
  | "recording"
  | "connecting"
  | "streaming"
  | "reconnecting"
  | "stopping"
  | "stopped";

export type LiveSttErrorCode =
  | "mic-permission-denied"
  | "no-input-device"
  | "ws-open-failed"
  | "network"
  | "unsupported-mime"
  | "worklet-init-failed"
  | "server-protocol"
  | "transcribe-unauthorized"
  | "unknown";

export type LiveSttError = {
  code: LiveSttErrorCode;
  message: string;
  details?: unknown;
};
export type SttMeta = { startMs?: number; endMs?: number; isFinal?: boolean };
export type SttSegment = { text: string; startMs: number; endMs: number };
export type LiveSttMetrics = {
  rttMs?: number;
  meanFrameIntervalMs?: number;
  droppedFrames?: number;
  wsBufferedBytes?: number;
  reconnects?: number;
};

type RecordingReadyPayload = {
  blob: Blob;
  meta: {
    durationMs: number;
    mime: string;
    size: number;
    peakDb?: number;
  };
} | null;

export type LiveSTTProps = {
  // Config
  lang: string; // e.g., "en-US"
  wsUrl?: string; // if omitted, will use env NEXT_PUBLIC_STT_WS_URL
  deviceId?: string | null;
  prebufferMs?: number; // default 4000
  frameMs?: number; // default 20
  sampleRate?: 16000 | 48000; // target PCM sample rate for STT; default 16000
  vad?: { enabled: boolean; thresholdDb: number; minVoiceMs: number } | null;
  autostart?: boolean;
  showWaveform?: boolean;
  showTimer?: boolean;

  // Outputs
  onReady?: () => void;
  onStateChange?: (s: LiveSttState) => void;
  onPermission?: (granted: boolean) => void;
  onConnectionChange?: (
    status: "connecting" | "open" | "closing" | "closed" | "error",
  ) => void;
  onPartial?: (text: string, meta?: SttMeta) => void;
  onFinal?: (text: string, meta?: SttMeta) => void;
  onSummary?: (fullText: string, segments: SttSegment[]) => void;
  onRecordingReady: (payload: RecordingReadyPayload) => void;
  onError?: (err: LiveSttError) => void;
  onMetrics?: (m: LiveSttMetrics) => void;
};

export type LiveSTTHandle = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  setDevice: (deviceId: string) => Promise<void>;
  setLang: (code: string) => void;
};

// -------- Small transport queue for PCM frames
class PCMQueue {
  private q: ArrayBuffer[] = [];
  constructor(
    private frameMs: number,
    private prebufferMs: number,
  ) {}
  push(f: ArrayBuffer) {
    this.q.push(f);
    const maxFrames = Math.floor(this.prebufferMs / this.frameMs);
    if (this.q.length > maxFrames) this.q.splice(0, this.q.length - maxFrames);
  }
  drain(send: (f: ArrayBuffer) => void) {
    while (this.q.length) send(this.q.shift()!);
  }
  clear() {
    this.q = [];
  }
}

// -------- Utilities
async function estimateDurationMs(blob: Blob): Promise<number> {
  try {
    const arrayBuf = await blob.arrayBuffer();
    // Very rough estimate using bytes at common WebM bitrate (~64kbps) if not decodable
    // Prefer: decode AudioBuffer via OfflineAudioContext (heavier). Keep simple for now.
    // Returning NaN is fine; parent can ignore.
    return NaN;
  } catch {
    return NaN;
  }
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// Dynamically build an AudioWorklet module URL that downsamples to 16 kHz Int16
function buildWorkletURL() {
  const processor = `class PCMDownsampler extends AudioWorkletProcessor {\n  constructor(){super(); this._buf=[]; this._inRate=sampleRate; this._target=16000; this._frameMs=20; this._samplesPerFrame=Math.floor(this._target*this._frameMs/1000); this._acc=[];}\n  _downsample(input){\n    if (!input || input.length===0) return new Float32Array(0);\n    const ch = input[0]; // mono assumed upstream
    if (!ch) return new Float32Array(0);\n    const ratio = this._inRate / this._target;\n    const outLen = Math.floor(ch.length / ratio);\n    const out = new Float32Array(outLen);\n    let idx=0;\n    for (let i=0;i<outLen;i++){ const srcIndex = i*ratio; const i0 = Math.floor(srcIndex); const i1 = Math.min(i0+1, ch.length-1); const t = srcIndex - i0; out[i] = ch[i0]*(1-t) + ch[i1]*t; }\n    return out;\n  }\n  process(inputs){\n    const input = inputs[0];\n    const f = this._downsample(input);\n    if (f.length){ this._acc.push(...f); }\n    while (this._acc.length >= this._samplesPerFrame){\n      const frame = this._acc.splice(0, this._samplesPerFrame);\n      // Float32 [-1,1] -> Int16 LE
      const ab = new ArrayBuffer(frame.length*2);\n      const view = new DataView(ab);\n      for (let i=0;i<frame.length;i++){ let s = Math.max(-1, Math.min(1, frame[i])); view.setInt16(i*2, s<0? s*0x8000 : s*0x7FFF, true); }\n      this.port.postMessage(ab, [ab]);\n    }\n    return true;\n  }\n}\nregisterProcessor('pcm-downsampler', PCMDownsampler);`;
  const blob = new Blob([processor], { type: "application/javascript" });
  return URL.createObjectURL(blob);
}

// Build AudioGraph: getUserMedia -> AudioContext -> Worklet -> onPCM(frame)
async function startPcmCapture(opts: {
  deviceId?: string | null;
  targetSampleRate?: 16000 | 48000;
  onPcm: (frame: ArrayBuffer) => void;
  onLevel?: (peakDb: number) => void;
}): Promise<
  { stop: () => void } & { mediaStream: MediaStream; audioCtx: AudioContext }
> {
  const constraints: MediaStreamConstraints = {
    audio: {
      deviceId: opts.deviceId ?? undefined,
      echoCancellation: true,
      noiseSuppression: true,
    },
  };
  const media = await navigator.mediaDevices.getUserMedia(constraints);
  const audioCtx = new (window.AudioContext ||
    (window as any).webkitAudioContext)();
  const src = audioCtx.createMediaStreamSource(media);

  // Load worklet
  const url = buildWorkletURL();
  await audioCtx.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);

  // Optional level meter using ScriptProcessor
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  const levelTimer = window.setInterval(() => {
    if (!opts.onLevel) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    // Peak estimate in dBFS
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      peak = Math.max(peak, Math.abs(v));
    }
    const peakDb = 20 * Math.log10(peak || 1e-6);
    opts.onLevel(peakDb);
  }, 100);

  const node = new (window as any).AudioWorkletNode(
    audioCtx,
    "pcm-downsampler",
  );
  node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
    opts.onPcm(e.data);
  };

  src.connect(node);
  node.connect(audioCtx.destination); // keep graph alive (silent)

  const stop = () => {
    try {
      window.clearInterval(levelTimer);
      node.disconnect();
      src.disconnect();
      audioCtx.close();
      media.getTracks().forEach((t) => t.stop());
    } catch {}
  };

  return { stop, mediaStream: media, audioCtx };
}

// MediaRecorder helper for preview/archive
async function startMediaRecorder(stream: MediaStream) {
  let mime = "audio/webm;codecs=opus";
  if (!MediaRecorder.isTypeSupported(mime)) mime = "audio/webm";
  if (!MediaRecorder.isTypeSupported(mime)) mime = "audio/mp4"; // Safari-ish
  if (!MediaRecorder.isTypeSupported(mime))
    throw new Error("No supported audio mime type");

  const mr = new MediaRecorder(stream, { mimeType: mime });
  const chunks: BlobPart[] = [];
  mr.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  mr.start(250);
  const stop = () =>
    new Promise<Blob>((resolve) => {
      mr.onstop = () => resolve(new Blob(chunks, { type: mime }));
      mr.stop();
    });
  return { stop, mime };
}

// Exponential backoff generator
function* backoffSeq(base = 300, max = 5000) {
  let t = base;
  while (true) {
    yield t;
    t = Math.min(max, t * 2);
  }
}

const LiveSTT = React.forwardRef<LiveSTTHandle, LiveSTTProps>(function LiveSTT(
  {
    lang,
    wsUrl,
    deviceId,
    prebufferMs = 4000,
    frameMs = 20,
    sampleRate = 16000,
    vad = null,
    autostart = false,
    showTimer = true,
    onReady,
    onStateChange,
    onPermission,
    onConnectionChange,
    onPartial,
    onFinal,
    onSummary,
    onRecordingReady,
    onError,
    onMetrics,
  },
  ref,
) {
  const [state, setState] = useState<LiveSttState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [peakDb, setPeakDb] = useState<number | undefined>(undefined);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectsRef = useRef(0);
  const pcmQueueRef = useRef(new PCMQueue(frameMs, prebufferMs));
  const stopPcmRef = useRef<(() => void) | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const stopMediaRef = useRef<(() => Promise<Blob>) | null>(null);
  const tickTimerRef = useRef<number | null>(null);
  const segmentsRef = useRef<SttSegment[]>([]);
  const startingRef = useRef(false);
  const stateRef = useRef<LiveSttState>("idle");

  // Imperative API
  useImperativeHandle(ref, () => ({
    start: () => start(),
    stop: () => stop(),
    setDevice: async (id: string) => {
      await stop();
      return start(id);
    },
    setLang: (code: string) => {
      // Language is applied when building WS URL next start
      console.debug("LiveSTT lang set to", code);
    },
  }));

  function setSt(s: LiveSttState) {
    console.log("LiveSTT state from ", stateRef.current, "to", s);
    stateRef.current = s;
    setState(s);
    onStateChange?.(s);
  }

  function currentWsUrl() {
    const base = wsUrl;
    if (!base) throw new Error("STT WS URL is not configured");
    const url = new URL(base);
    url.searchParams.set("language", lang);
    return url.toString();
  }

  async function start(requestedDeviceId?: string) {
    if (startingRef.current) return;
    startingRef.current = true;
    if (
      stateRef.current === "recording" ||
      stateRef.current === "streaming" ||
      stateRef.current === "connecting"
    )
      return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    segmentsRef.current = [];
    pcmQueueRef.current.clear();

    setSt("requesting");
    try {
      // Mic + AudioGraph
      const { stop, mediaStream } = await startPcmCapture({
        deviceId: requestedDeviceId ?? deviceId,
        targetSampleRate: sampleRate,
        onPcm: (frame) => onPcmFrame(frame),
        onLevel: (db) => setPeakDb(db),
      });
      stopPcmRef.current = stop;
      mediaStreamRef.current = mediaStream;
      onPermission?.(true);
    } catch (e: any) {
      onPermission?.(false);
      const err: LiveSttError = {
        code: "mic-permission-denied",
        message: e?.message || "Microphone permission denied",
        details: e,
      };
      console.log("LiveSTT error", err);
      onError?.(err);
      setSt("idle");
      return;
    }

    // MediaRecorder for preview/archive
    try {
      const { stop, mime } = await startMediaRecorder(mediaStreamRef.current!);
      stopMediaRef.current = stop;
      (stopMediaRef.current as any)._mime = mime;
    } catch (e: any) {
      console.error("Failed to start MediaRecorder", e);
      onError?.({
        code: "unsupported-mime",
        message: e?.message || "Failed to start MediaRecorder",
        details: e,
      });
    }

    // Timer
    const t0 = Date.now();
    if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
    tickTimerRef.current = window.setInterval(
      () => setElapsedMs(Date.now() - t0),
      200,
    ) as any;
    setSt("recording");

    // Open WebSocket
    openWebSocket(/*isReconnect*/ false);
    startingRef.current = false;
  }

  function openWebSocket(isReconnect: boolean) {
    const url = currentWsUrl();
    try {
      onConnectionChange?.("connecting");
      setSt(
        isReconnect
          ? "reconnecting"
          : stateRef.current === "recording"
            ? "connecting"
            : stateRef.current,
      );

      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";
      ws.onopen = () => {
        reconnectsRef.current += isReconnect ? 1 : 0;
        onConnectionChange?.("open");
        // Drain prebuffer first
        pcmQueueRef.current.drain((f) => safeSend(ws, f));
        if (
          stateRef.current === "connecting" ||
          stateRef.current === "reconnecting" ||
          stateRef.current === "recording"
        )
          setSt("streaming");
      };
      ws.onmessage = (ev) => {
        // Expect JSON messages for transcripts
        try {
          const msg = JSON.parse(ev.data);
          if (msg.isPartial === true && msg.text)
            onPartial?.(msg.text, { isFinal: false });
          if (msg.isPartial === false && msg.text) {
            onFinal?.(msg.text, { isFinal: true });
            const now = elapsedMs;
            segmentsRef.current.push({
              text: msg.text,
              startMs: Math.max(0, now - 2000),
              endMs: now,
            });
          }
        } catch {}
      };
      ws.onerror = () => {
        onConnectionChange?.("error");
      };
      ws.onclose = () => {
        onConnectionChange?.("closed");
        if (
          stateRef.current === "stopping" ||
          stateRef.current === "stopped" ||
          stateRef.current === "idle"
        )
          return;
        // Attempt reconnect while still recording
        if (
          stateRef.current === "requesting" ||
          stateRef.current === "recording" ||
          stateRef.current === "streaming" ||
          stateRef.current === "connecting" ||
          stateRef.current === "reconnecting"
        ) {
          const bo = backoffSeq();
          const next = bo.next().value as number;
          window.setTimeout(() => openWebSocket(true), next);
        }
      };
      wsRef.current = ws;
    } catch (e: any) {
      onError?.({
        code: "ws-open-failed",
        message: e?.message || "WebSocket open failed",
        details: e,
      });
      setSt("recording"); // still recording locally
    }
  }

  function safeSend(ws: WebSocket, frame: ArrayBuffer) {
    if (ws.readyState !== WebSocket.OPEN) return;
    // Backpressure guard
    if (ws.bufferedAmount > 1_000_000) return; // ~1MB pending, skip
    ws.send(frame);
    onMetrics?.({ wsBufferedBytes: ws.bufferedAmount });
  }

  function onPcmFrame(frame: ArrayBuffer) {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      pcmQueueRef.current.push(frame);
      return;
    }
    safeSend(ws, frame);
  }

  async function stop() {
    if (stateRef.current === "stopped") return;
    setSt("stopping");
    try {
      wsRef.current?.close();
    } catch {}
    try {
      stopPcmRef.current?.();
    } catch {}

    let blob: Blob | null = null;
    let mime = "audio/webm";
    try {
      if (stopMediaRef.current) {
        blob = await stopMediaRef.current();
        mime = (stopMediaRef.current as any)._mime || mime;
      }
    } catch {}

    if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
    setSt("stopped");

    if (blob) {
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      const durationMs = await estimateDurationMs(blob);
      onRecordingReady({
        blob,
        meta: { durationMs, mime, size: blob.size, peakDb },
      });
    }

    onSummary?.(
      segmentsRef.current.map((s) => s.text).join(" "),
      segmentsRef.current,
    );
  }

  useEffect(() => {
    onReady?.();
    return () => {
      try {
        wsRef.current?.close();
      } catch {}
      try {
        stopPcmRef.current?.();
      } catch {}
      if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Reset queue size when props change
    pcmQueueRef.current = new PCMQueue(frameMs, prebufferMs);
  }, [frameMs, prebufferMs]);

  const handleCancel = () => {
    onRecordingReady(null);
    stateRef.current = "idle";
    setSt("idle");
  };
  // ---------- UI (minimal, clean)
  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          State: <span className="font-medium text-foreground">{state}</span>
        </div>
        {showTimer && (
          <div className="text-sm tabular-nums">{formatTime(elapsedMs)}</div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        {stateRef.current === "idle" || stateRef.current === "stopped" ? (
          <Button
            className="rounded-2xl px-4 py-2 bg-primary text-primary-foreground shadow hover:opacity-90"
            onClick={() => start()}
          >
            Record
          </Button>
        ) : stateRef.current === "recording" ||
          stateRef.current === "connecting" ||
          stateRef.current === "streaming" ||
          stateRef.current === "reconnecting" ? (
          <button
            className="rounded-2xl px-4 py-2 bg-destructive text-destructive-foreground shadow hover:opacity-90"
            onClick={() => stop()}
            type="button"
          >
            Stop
          </button>
        ) : (
          <button
            className="rounded-2xl px-4 py-2 bg-primary text-primary-foreground shadow"
            onClick={() => start()}
            type="button"
          >
            Record
          </button>
        )}
        {stateRef.current === "stopped" && (
          <Button onClick={handleCancel}>Cancel</Button>
        )}
      </div>
    </div>
  );
});

export default LiveSTT;
