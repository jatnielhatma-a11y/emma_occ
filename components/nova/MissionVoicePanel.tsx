"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command, Mic, MicOff, Navigation, ShieldCheck, Volume2 } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { classifyMissionCommand, type MissionCommandResult } from "@/lib/nova/mission-intelligence";

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
  "Privacy review"
];

export function MissionVoicePanel({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(true);
  const [spokenReplies, setSpokenReplies] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<MissionCommandResult>(() => classifyMissionCommand("help"));

  const confidence = useMemo(() => `${Math.round(result.confidence * 100)}%`, [result.confidence]);

  function runCommand(command: string) {
    const nextResult = classifyMissionCommand(command);
    setTranscript(command);
    setResult(nextResult);

    if (spokenReplies && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(nextResult.response);
      utterance.rate = 0.95;
      utterance.pitch = 0.96;
      window.speechSynthesis.speak(utterance);
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
      runCommand(finalResult);
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
    if (result.route) router.push(result.route);
  }

  return (
    <section className="nova-surface rounded-lg border border-occ-line p-5 shadow-nova">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="green">Release 9 active</StatusBadge>
            <StatusBadge tone="cyan">Push-to-talk</StatusBadge>
            <StatusBadge tone="neutral">No transcript storage</StatusBadge>
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-occ-cyan">NOVA Mission Voice</p>
          <h2 className={compact ? "mt-2 text-2xl font-semibold text-occ-platinum" : "mt-2 text-3xl font-semibold text-occ-platinum"}>
            NOVA voice command layer
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Speak one command at a time to open your brief, duty status, commute, calendar, alerts, settings, privacy controls, or optimization loops. NOVA listens only after you press the microphone.
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
            className="focus-ring flex min-h-14 w-full items-center justify-center gap-3 rounded-md bg-occ-cyan px-4 text-sm font-semibold text-occ-ink transition hover:bg-cyan-200"
          >
            {listening ? <MicOff size={19} /> : <Mic size={19} />}
            {listening ? "Listening..." : "Start voice command"}
          </button>

          <button
            type="button"
            onClick={() => setSpokenReplies((value) => !value)}
            className="focus-ring mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-occ-line bg-occ-panel2 px-3 text-sm text-zinc-200 transition hover:border-occ-cyan/50 hover:text-white"
          >
            <Volume2 size={17} />
            {spokenReplies ? "Spoken replies on" : "Spoken replies off"}
          </button>

          <div className="mt-4 rounded-md border border-occ-line bg-occ-panel p-3 text-sm">
            <div className="flex items-center gap-2 text-zinc-300">
              <ShieldCheck size={16} className="text-occ-green" />
              <span>Privacy mode</span>
            </div>
            <p className="mt-2 text-zinc-500">
              Commands stay in this browser session. External actions are routed for review instead of being executed silently.
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
              <h3 className="mt-1 text-xl font-semibold text-white">{result.label}</h3>
            </div>
            <StatusBadge tone={result.safety === "local-route" ? "green" : result.safety === "advisory" ? "cyan" : "amber"}>{result.safety.replaceAll("-", " ")}</StatusBadge>
          </div>

          <p className="mt-3 rounded-md border border-occ-line bg-occ-ink/80 p-3 text-sm text-zinc-300">
            {transcript || "Say: NOVA brief me"}
          </p>
          <p className="mt-3 text-sm text-zinc-400">{result.response}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusBadge tone="neutral">Confidence {confidence}</StatusBadge>
            {result.requiresConfirmation ? <StatusBadge tone="amber">Needs review</StatusBadge> : <StatusBadge tone="green">Safe route</StatusBadge>}
            {result.route ? (
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

          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {quickCommands.map((command) => (
              <button
                type="button"
                key={command}
                onClick={() => runCommand(command)}
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
