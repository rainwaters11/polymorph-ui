"use client";

import { useEffect, useRef, useState } from "react";

type PlaybackState = "idle" | "speaking" | "unavailable" | "error";

export function TextToSpeechControl({ text }: { text: string }) {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");

  useEffect(() => {
    return () => {
      if (utteranceRef.current && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      utteranceRef.current = null;
    };
  }, []);

  function togglePlayback() {
    if (playbackState === "speaking") {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setPlaybackState("idle");
      return;
    }

    if (
      !("speechSynthesis" in window) ||
      typeof globalThis.SpeechSynthesisUtterance !== "function"
    ) {
      setPlaybackState("unavailable");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = document.documentElement.lang || "en-US";
    utterance.rate = 0.92;
    utterance.onend = () => setPlaybackState("idle");
    utterance.onerror = () => setPlaybackState("error");
    utteranceRef.current = utterance;
    setPlaybackState("speaking");
    window.speechSynthesis.speak(utterance);
  }

  const speaking = playbackState === "speaking";

  return (
    <div className="text-to-speech-control">
      <button
        type="button"
        className="adaptive-listen-control"
        disabled={playbackState === "unavailable"}
        aria-pressed={speaking}
        onClick={togglePlayback}
      >
        <span aria-hidden="true">{speaking ? "■" : "▶"}</span>
        {speaking ? "Stop audio" : "Listen to explanation"}
      </button>
      <span className="sr-status" role="status" aria-live="polite">
        {speaking
          ? "Reading the plain-language explanation aloud."
          : playbackState === "error"
            ? "Audio could not start. The written explanation remains available."
            : playbackState === "unavailable"
              ? "Text-to-speech is not available in this browser."
              : "Audio is stopped."}
      </span>
    </div>
  );
}
