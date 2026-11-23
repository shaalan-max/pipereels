"use client";

import { useEffect, useRef, useState } from "react";
import { FlipHorizontal, Minus, Pause, Play, Plus, RotateCcw, X } from "lucide-react";
import { cx } from "@/components/ui";

/** Full-screen scrolling script for the client to read while filming on their phone or laptop. */
export function Teleprompter({ script, onClose }: { script: string; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [size, setSize] = useState(40);
  const [mirror, setMirror] = useState(false);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const el = box.current;
      if (el) {
        el.scrollTop += ((now - last) / 1000) * speed * 18;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) setPlaying(false);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black text-white">
      <div ref={box} className="flex-1 overflow-y-auto px-6 sm:px-16" onClick={() => setPlaying((p) => !p)}>
        <div className="pointer-events-none fixed inset-x-0 top-1/3 h-px bg-white/10" />
        <div className={cx("mx-auto max-w-3xl py-[40vh] font-semibold leading-snug", mirror && "-scale-x-100")} style={{ fontSize: size }}>
          {script.split("\n").map((line, i) => (
            <p key={i} className="mb-[0.6em] whitespace-pre-wrap">
              {line || " "}
            </p>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-zinc-950 px-3 py-3 text-sm">
        <Ctl onClick={() => setPlaying((p) => !p)} label={playing ? "Pause" : "Play"} wide>
          {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
        </Ctl>
        <Ctl onClick={() => box.current && (box.current.scrollTop = 0)} label="Restart">
          <RotateCcw className="size-4" />
        </Ctl>
        <span className="mx-1 flex items-center gap-1 rounded-lg bg-white/10 px-2">
          <span className="text-xs text-white/60">Speed</span>
          <Ctl onClick={() => setSpeed((s) => Math.max(1, s - 1))} label="Slower">
            <Minus className="size-4" />
          </Ctl>
          <span className="w-4 text-center tabular-nums">{speed}</span>
          <Ctl onClick={() => setSpeed((s) => Math.min(10, s + 1))} label="Faster">
            <Plus className="size-4" />
          </Ctl>
        </span>
        <span className="mx-1 flex items-center gap-1 rounded-lg bg-white/10 px-2">
          <span className="text-xs text-white/60">Text</span>
          <Ctl onClick={() => setSize((s) => Math.max(24, s - 6))} label="Smaller text">
            <Minus className="size-4" />
          </Ctl>
          <Ctl onClick={() => setSize((s) => Math.min(96, s + 6))} label="Bigger text">
            <Plus className="size-4" />
          </Ctl>
        </span>
        <Ctl onClick={() => setMirror((m) => !m)} label="Mirror (for teleprompter glass)">
          <FlipHorizontal className="size-4" />
        </Ctl>
        <Ctl onClick={onClose} label="Close">
          <X className="size-5" />
        </Ctl>
      </div>
    </div>
  );
}

function Ctl({ onClick, label, children, wide }: { onClick: () => void; label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className={cx("flex h-10 items-center justify-center rounded-lg hover:bg-white/10", wide ? "w-16 bg-white/15" : "w-10")}>
      {children}
    </button>
  );
}
