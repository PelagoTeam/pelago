import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

const decodedCache = new Map<string, AudioBuffer>();

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type Peak = { min: number; max: number };
type DrawState = {
  peaks: Peak[] | null;
  midY: number;
  bucketSize: number;
  scale: number;
  cssH: number;
};

function ensureAudioContext(ref: React.MutableRefObject<AudioContext | null>) {
  let ac = ref.current;
  if (!ac) {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? window.webkitAudioContext;
    if (!Ctor) throw new Error("Web Audio API not supported");
    ac = new Ctor();
    ref.current = ac;
  }
  return ac;
}

export default function WaveAudioPlayer({
  src,
  height,
}: {
  src: string;
  height: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const acRef = useRef<AudioContext | null>(null);
  const drawStateRef = useRef<DrawState>({
    peaks: null,
    midY: 0,
    bucketSize: 0,
    scale: 1,
    cssH: 0,
  });

  const [duration, setDuration] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [cssWidth, setCssWidth] = useState<number>(0);
  const [audioBuf, setAudioBuf] = useState<AudioBuffer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0].contentRect.width);
      setCssWidth(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function fetchAndDecode() {
      if (!src) return;
      setError("");

      try {
        // reuse decoded buffer if we’ve seen this src before
        if (decodedCache.has(src)) {
          const buf = decodedCache.get(src)!;
          if (!cancelled) {
            setAudioBuf(buf);
            setDuration(buf.duration);
          }
          return;
        }

        const res = await fetch(src, { signal: controller.signal });
        const arr = await res.arrayBuffer();

        const ac = ensureAudioContext(acRef); // <-- typed, never null
        const buf = await ac.decodeAudioData(arr);

        decodedCache.set(src, buf);

        if (!cancelled) {
          setAudioBuf(buf);
          setDuration(buf.duration);
        }
      } catch (e: unknown) {
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === "object" && e && "toString" in e
              ? String(e)
              : "Failed to load audio";
        if (!(e instanceof DOMException && e.name === "AbortError")) {
          setError(msg);
        }
      }
    }

    fetchAndDecode();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [src]);

  useEffect(() => {
    return () => {
      acRef.current?.close().catch(() => {});
      acRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        setCssWidth(w);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // --- inside the draw effect ---
  useEffect(() => {
    if (!audioBuf || !canvasRef.current || cssWidth === 0) return;

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const canvas = canvasRef.current;
    const cssH = height;

    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssH * dpr); // FIX: multiply by dpr
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssH + "px";

    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssH);

    const chL = audioBuf.getChannelData(0);
    const chR =
      audioBuf.numberOfChannels > 1 ? audioBuf.getChannelData(1) : null;
    const total = chL.length;

    const bucketSize = 4;
    const columns = Math.max(1, Math.floor(cssWidth / bucketSize));
    const spp = Math.max(1, Math.floor(total / columns));
    const midY = cssH / 2;

    // 1) compute peaks + maxSpan
    const peaks: { min: number; max: number }[] = [];
    let maxSpan = 0; // track tallest span observed
    for (let x = 0; x < columns; x++) {
      const start = x * spp;
      let min = 1.0,
        max = -1.0;
      for (let i = 0; i < spp && start + i < total; i++) {
        const l = chL[start + i];
        const r = chR ? chR[start + i] : l;
        const s = (l + r) * 0.5;
        if (s < min) min = s;
        if (s > max) max = s;
      }
      peaks.push({ min, max });
      const span = Math.abs(max - min);
      if (span > maxSpan) maxSpan = span;
    }

    // 2) scaling so tallest bar === full height
    // With your previous "amp = cssH" approach, barHeightPx = (max-min)*cssH.
    // To make tallest equal cssH, multiply by (1 / maxSpan).
    const scale = maxSpan > 0 ? 1 / maxSpan : 1; // fallback if silent

    // Optional: tiny min height to keep silent sections visible (comment out if not desired)
    const minBarHeightPx = 1;

    // draw with scaled heights (future in light, past later if you animate)
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let i = 0; i < peaks.length; i++) {
      const { min, max } = peaks[i];

      // raw span -> scaled to fill entire canvas at max
      let barH = Math.abs(max - min) * cssH * scale;
      if (minBarHeightPx) barH = Math.max(minBarHeightPx, barH);

      // center around average value to preserve DC offset
      const avg = (max + min) * 0.5;
      let y1 = midY - barH / 2 - avg * cssH; // shift by avg
      let y2 = y1 + barH;

      // clamp to canvas
      if (y1 < 0) y1 = 0;
      if (y2 > cssH) y2 = cssH;

      const x = i * bucketSize;
      ctx.fillRect(x, y1, bucketSize - 1, y2 - y1);
    }

    // stash for animation pass
    drawStateRef.current = {
      peaks,
      midY,
      bucketSize,
      scale,
      cssH,
    };
  }, [audioBuf, cssWidth, height]);

  const onLoadedMetadata = () => {
    const el = audioRef.current;
    if (el && Number.isFinite(el.duration)) setDuration(el.duration);
  };

  const timeToX = useCallback(
    (t: number) =>
      !duration || !cssWidth
        ? 0
        : Math.min(cssWidth, Math.max(0, (t / duration) * cssWidth)),
    [duration, cssWidth],
  );
  const xToTime = (x: number) =>
    !cssWidth || !duration ? 0 : (x / cssWidth) * duration;

  const seekFromClientX = (clientX: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = clientX - rect.left;
    const t = xToTime(x);
    if (audioRef.current && Number.isFinite(t))
      audioRef.current.currentTime = Math.max(0, Math.min(duration, t));
  };

  useEffect(() => {
    const scope = containerRef.current || document.body;
    const pastColor = resolveTailwindBgColor("bg-white", scope);
    const futureColor = resolveTailwindBgColor("bg-white/50", scope);

    let raf = 0;
    const tick = () => {
      const el = audioRef.current;
      const canvas = canvasRef.current;
      const { peaks, midY, bucketSize, scale, cssH: H } = drawStateRef.current;
      if (el && canvas && peaks && peaks.length) {
        const ctx = canvas.getContext("2d")!;
        if (!ctx) return;
        ctx.clearRect(0, 0, cssWidth, height);

        // Convert current pixel position → current bucket index
        const curX = timeToX(el.currentTime);
        const curBucket = Math.floor(curX / bucketSize);

        // Make bars chunky
        const barGap = 1; // tweak gap between bars
        ctx.lineWidth = Math.max(1, bucketSize - barGap);
        ctx.lineCap = "butt";

        const drawBuckets = (from: number, to: number, stroke: string) => {
          ctx.beginPath();
          for (let b = from; b < to; b++) {
            const { min, max } = peaks[b];

            // scaled height so tallest == H
            let barH = Math.abs(max - min) * H * scale;
            if (barH < 1) barH = 1; // optional tiny min

            // center around average, preserving DC offset
            const avg = (max + min) * 0.5;
            let y1 = midY - barH / 2 - avg * H;
            let y2 = y1 + barH;

            // clamp
            if (y1 < 0) y1 = 0;
            if (y2 > H) y2 = H;

            const xPx = b * bucketSize + bucketSize / 2;
            ctx.moveTo(xPx, y1);
            ctx.lineTo(xPx, y2);
          }
          ctx.strokeStyle = stroke;
          ctx.stroke();
        };

        // --- Past (<= curBucket) ---
        drawBuckets(0, Math.min(peaks.length, curBucket + 1), pastColor);

        // --- Future (> curBucket) ---
        drawBuckets(Math.max(0, curBucket + 1), peaks.length, futureColor);
        if (playheadRef.current) {
          playheadRef.current.style.transform = `translateX(${curX}px)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, cssWidth, height, timeToX]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      const el = audioRef.current;
      if (el) {
        // throttle to ~10fps
        if (t - last > 100) {
          last = t;
          setCurrentTime(el.currentTime || 0);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const isDown = useRef(false);
  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    isDown.current = true;
    seekFromClientX(e.clientX);
  };
  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (isDown.current) seekFromClientX(e.clientX);
  };
  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    isDown.current = false;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  const fmt = (t: number) => {
    if (!Number.isFinite(t)) return "00:00";
    const m = Math.floor(t / 60),
      s = Math.floor(t % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div
      className="w-full gap-3 flex justify-center items-center"
      style={{ height: height + 10 }}
    >
      <div className="flex items-center justify-center flex-col gap-2">
        <Button
          className="flex items-center justify-center h-9 w-9 rounded-full border-2 border-white"
          onClick={() => {
            const el = audioRef.current;
            if (!el) return;
            if (el.paused) {
              void el.play();
            } else {
              el.pause();
            }
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" fill="white" />
          ) : (
            <Play className="w-6 h-6" fill="white" />
          )}
        </Button>
      </div>

      <div className={`w-full`}>
        <div
          ref={containerRef}
          className="cursor-pointer w-full"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <canvas ref={canvasRef} className="block w-full" style={{ height }} />
        </div>
        <audio
          ref={audioRef}
          src={src}
          onLoadedMetadata={onLoadedMetadata}
          className="hidden"
        />
      </div>
      <div className="text-xs tabular-nums text-white">{fmt(currentTime)}</div>

      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
    </div>
  );
}

function resolveTailwindBgColor(cls: string, scopeEl: HTMLElement): string {
  const temp = document.createElement("div");
  temp.className = cls;
  temp.style.position = "absolute";
  temp.style.visibility = "hidden";
  temp.style.pointerEvents = "none";
  scopeEl.appendChild(temp);
  const color = getComputedStyle(temp).backgroundColor || "#000";
  scopeEl.removeChild(temp);
  return color;
}
