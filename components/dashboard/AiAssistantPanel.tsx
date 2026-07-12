"use client";

import { Bot } from "lucide-react";
import { FormEvent, useState } from "react";
import { StatusBadge } from "./StatusBadge";

const prompts = [
  "What is my next duty?",
  "Do I have a night shift this week?",
  "Are there any conflicts?",
  "Give me a weekly summary."
];

export function AiAssistantPanel() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "emma"; text: string }>>([]);
  const [prompt, setPrompt] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  async function askEmma(nextPrompt: string) {
    setIsAsking(true);
    setMessages((current) => [...current, { role: "user", text: nextPrompt }]);
    const response = await fetch("/api/emma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: nextPrompt })
    });
    const payload = await response.json();
    setMessages((current) => [
      ...current,
      { role: "emma", text: payload.ok ? payload.answer : payload.error || "Emma could not answer from the roster data." }
    ]);
    setPrompt("");
    setIsAsking(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPrompt = prompt.trim();
    if (nextPrompt) void askEmma(nextPrompt);
  }

  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-occ-panel2 text-occ-cyan">
          <Bot size={20} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">Emma AI assistant</h2>
          <p className="text-sm text-zinc-500">Roster-aware questions only</p>
        </div>
        <span className="ml-auto">
          <StatusBadge tone="green">Live</StatusBadge>
        </span>
      </div>

      {messages.length ? (
        <div className="mt-5 space-y-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={message.role === "emma" ? "rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-200" : "text-sm text-occ-cyan"}
            >
              {message.text}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => askEmma(prompt)}
            disabled={isAsking}
            className="focus-ring block w-full rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-left text-sm text-zinc-300"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask Emma about your roster..."
          className="focus-ring min-w-0 flex-1 rounded-md border border-occ-line bg-occ-ink px-3 py-2 text-sm text-white"
        />
        <button
          disabled={isAsking}
          className="focus-ring rounded-md bg-occ-cyan px-4 py-2 text-sm font-semibold text-occ-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
