"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command, ExternalLink, Loader2, Mic, MicOff, Navigation, Search, ShieldCheck, Volume2 } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { classifyMissionCommand, type MissionCommandResult } from "@/lib/nova/mission-intelligence";
import type { NovaVoiceAnswer } from "@/lib/nova/voice-answer";

type SpeechRecognitionResultLike = {
  readonly 0: {
    readonly transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  results: {
    readonly length: number;
    readonly [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

const quickCommands = [
  "NOVA brief me",
  "Check my commute",
  "Show next duty",
  "Open calendar",
  "Show alerts",
  "Privacy review",
  "What is NOVA learning?"
];

export function MissionVoicePanel({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(true);
  const [spokenReplies, setSpokenReplies] = useState(false);
  const [allowWeb, setAllowWeb] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [typedPrompt, setTypedPrompt] = useState("");
  const [result, setResult] = useState<MissionCommandResult>(() => classifyMissionCommand("help"));
  const [answer, setAnswer] = useState<NovaVoiceAnswer | null>(null);

  const confidence = useMemo(() => `${Math.round((answer?.confidence ?? result.confidence) * 100)}%`, [answer?.confidence, result.confidence]);

  function speak(text: string) {
    if (spokenReplies && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 0.96;
      window.speechSynthesis.speak(utterance);
    }
  }

  async function runCommand(command: string) {
    const nextResult = classifyMissionCommand(command);
    setTranscript(command);
    setResult(nextResult);
    setAnswer(null);
    setIsThinking(true);

    try {
      const response = await fetch("/api/nova/voice-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: command, allowWeb })
      });
      const payload = await response.json();

      if (payload.ok) {
        setAnswer(payload as NovaVoiceAnswer);
        speak(payload.answer);
      } else {
        setAnswer(null);
        setResult({
          intent: "unknown",
          label: "NOVA unavailable",
          response: payload.error || "NOVA could not answer that yet.",
          confidence: 0.2,
          requiresConfirmation: true,
          safety: "review-required"
        });
        speak(payload.error || "NOVA could not answer that yet.");
      }
    } catch {
      setAnswer(null);
      setResult({
        intent: "unknown",
        label: "NOVA interrupted",
        response: "NOVA could not reach the answer service. Try again in a moment.",
        confidence: 0.2,
        requiresConfirmation: true,
        safety: "review-required"
      });
    } finally {
      setIsThinking(false);
    }
  }

  function startListening() {
    if (typeof window === "undefined") return;
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setSpeechAvailable(false);
      setResult({
        intent: "help",
        label: "Browser voice unavailable",
        response: "This browser does not expose speech recognition. Use the quick command buttons below.",
        confidence: 1,
        requiresConfirmation: false,
        safety: "advisory"
      });
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const finalResult = event.results[event.results.length - 1]?.[0]?.transcript ?? "";
      void runCommand(finalResult);
    };
    recognition.onerror = () => {
      setListening(false);
      setResult({
        intent: "unknown",
        label: "Voice capture interrupted",
        response: "Voice capture stopped before a command was recognized. Try again or use a quick command.",
        confidence: 0.3,
        requiresConfirmation: true,
        safety: "review-required"
      });
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function openTarget() {
    const route = answer?.route ?? result.route;
    if (route) router.push(route);
  }

  function submitTypedPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = typedPrompt.trim();
    if (!prompt) return;
    void runCommand(prompt);
  }

  const displayTitle = answer?.title ?? result.label;
  const displayResponse = answer?.answer ?? result.response;
  const displayRoute = answer?.route ?? result.route;
  const displaySafety = answer?.usedWeb ? "advisory" : result.safety;

  return (
    <section className="nova-surface rounded-lg border border-occ-line p-5 shadow-nova">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="green">Release 9 active</StatusBadge>
            <StatusBadge tone="cyan">Push-to-talk</StatusBadge>
            <StatusBadge tone={allowWeb ? "green" : "neutral"}>{allowWeb ? "Web lookup on" : "App only"}</StatusBadge>
            <StatusBadge tone="neutral">No transcript storage</StatusBadge>
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-occ-cyan">NOVA Mission Voice</p>
          <h2 className={compact ? "mt-2 text-2xl font-semibold text-occ-platinum" : "mt-2 text-3xl font-semibold text-occ-platinum"}>
            NOVA voice command layer
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Speak or type a command or question. NOVA checks the app first, can use public web lookup for general questions, and labels the sources it used. NOVA listens only after you press the microphone.
          </p>
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-md border border-occ-cyan/30 bg-occ-cyan/10 text-occ-cyan">
          <Command size={22} />
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_1fr]">
        <div className="rounded-md border border-occ-line bg-occ-ink/80 p-4">
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            disabled={isThinking}
            className="focus-ring flex min-h-14 w-full items-center justify-center gap-3 rounded-md bg-occ-cyan px-4 text-sm font-semibold text-occ-ink transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-70"
          >
            {isThinking ? <Loader2 size={19} className="animate-spin" /> : listening ? <MicOff size={19} /> : <Mic size={19} />}
            {isThinking ? "NOVA is checking..." : listening ? "Listening..." : "Ask NOVA"}
          </button>

          <button
            type="button"
            onClick={() => setSpokenReplies((value) => !value)}
            className="focus-ring mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-occ-line bg-occ-panel2 px-3 text-sm text-zinc-200 transition hover:border-occ-cyan/50 hover:text-white"
          >
            <Volume2 size={17} />
            {spokenReplies ? "Spoken replies on" : "Spoken replies off"}
          </button>

          <label className="mt-3 flex items-center justify-between gap-4 rounded-md border border-occ-line bg-occ-panel2 px-3 py-3 text-sm text-zinc-300">
            <span className="flex items-center gap-2">
              <Search size={16} className="text-occ-cyan" />
              Allow public web lookup
            </span>
            <input
              type="checkbox"
              checked={allowWeb}
              onChange={(event) => setAllowWeb(event.target.checked)}
              className="h-5 w-5 accent-occ-cyan"
            />
          </label>

          <form onSubmit={submitTypedPrompt} className="mt-3">
            <label className="block text-sm text-zinc-300">
              Type to NOVA
              <textarea
                value={typedPrompt}
                onChange={(event) => setTypedPrompt(event.target.value)}
                rows={3}
                placeholder="Ask: What is my next duty? Or: look up airport disruption news"
                className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-panel px-3 py-2 text-sm text-white placeholder:text-zinc-600"
              />
            </label>
            <button
              className="focus-ring mt-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-occ-cyan/40 bg-occ-cyan/10 px-3 text-sm text-cyan-100 transition hover:border-occ-cyan hover:text-white disabled:cursor-wait disabled:opacity-70"
              disabled={isThinking}
            >
              {isThinking ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Ask
            </button>
          </form>

          <div className="mt-4 rounded-md border border-occ-line bg-occ-panel p-3 text-sm">
            <div className="flex items-center gap-2 text-zinc-300">
              <ShieldCheck size={16} className="text-occ-green" />
              <span>Privacy mode</span>
            </div>
            <p className="mt-2 text-zinc-500">
              Commands are answered for the current session. NOVA does not store voice transcripts, and public web lookup is skipped for personal operational questions.
            </p>
          </div>

          {!speechAvailable ? (
            <p className="mt-3 rounded-md border border-occ-amber/40 bg-occ-amber/10 p-3 text-sm text-amber-100">
              Speech recognition is not available in this browser. Quick commands remain available.
            </p>
          ) : null}
        </div>

        <div className="rounded-md border border-occ-line bg-occ-panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-400">Recognized command</p>
              <h3 className="mt-1 text-xl font-semibold text-white">{displayTitle}</h3>
            </div>
            <StatusBadge tone={displaySafety === "local-route" ? "green" : displaySafety === "advisory" ? "cyan" : "amber"}>
              {displaySafety.replaceAll("-", " ")}
            </StatusBadge>
          </div>

          <p className="mt-3 rounded-md border border-occ-line bg-occ-ink/80 p-3 text-sm text-zinc-300">
            {transcript || "Say: NOVA brief me, or ask a question"}
          </p>
          <p className="mt-3 text-sm text-zinc-300">{displayResponse}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge tone="neutral">Confidence {confidence}</StatusBadge>
            {answer?.usedWeb ? <StatusBadge tone="cyan">Web used</StatusBadge> : null}
            {result.requiresConfirmation && !answer ? <StatusBadge tone="amber">Needs review</StatusBadge> : <StatusBadge tone="green">Answered</StatusBadge>}
            {displayRoute ? (
              <button
                type="button"
                onClick={openTarget}
                className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-md border border-occ-cyan/40 bg-occ-cyan/10 px-3 text-sm text-cyan-100 transition hover:border-occ-cyan hover:text-white"
              >
                <Navigation size={16} />
                Open target
              </button>
            ) : null}
          </div>

          {answer?.sources.length ? (
            <div className="mt-4 rounded-md border border-occ-line bg-occ-ink/70 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Sources</p>
              <div className="mt-2 space-y-2">
                {answer.sources.map((item, index) => (
                  <div key={`${item.label}-${item.source}-${index}`} className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <StatusBadge tone={item.freshness === "live" || item.freshness === "recent" ? "green" : item.freshness === "fallback" ? "amber" : "red"}>
                      {item.freshness}
                    </StatusBadge>
                    {item.url ? (
                      <a href={item.url} target="_blank" className="inline-flex items-center gap-1 text-occ-cyan hover:text-white">
                        {item.source}
                        <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span>{item.source}</span>
                    )}
                    {item.detail ? <span className="text-zinc-600">{item.detail}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {quickCommands.map((command) => (
              <button
                type="button"
                key={command}
                onClick={() => void runCommand(command)}
                className="focus-ring min-h-10 rounded-md border border-occ-line bg-occ-ink/80 px-3 text-left text-sm text-zinc-300 transition hover:border-occ-cyan/50 hover:text-white"
              >
                {command}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
