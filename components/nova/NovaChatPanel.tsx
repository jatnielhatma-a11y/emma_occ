"use client";

import { type FormEvent, useState } from "react";
import { BrainCircuit, Loader2, Upload } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

type ChatMessage = {
  role: "user" | "nova";
  text: string;
};

export function NovaChatPanel({ importedMemoryCount = 0 }: { importedMemoryCount?: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [allowWeb, setAllowWeb] = useState(true);
  const [useImportedMemory, setUseImportedMemory] = useState(true);
  const [storeExchange, setStoreExchange] = useState(true);
  const [status, setStatus] = useState("");
  const [memoryCount, setMemoryCount] = useState(importedMemoryCount);

  async function askNova(nextPrompt: string) {
    setIsWorking(true);
    setStatus("");
    setMessages((current) => [...current, { role: "user", text: nextPrompt }]);
    try {
      const response = await fetch("/api/nova/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: nextPrompt, allowWeb, useImportedMemory, storeExchange })
      });
      const payload = await response.json();
      setMessages((current) => [
        ...current,
        {
          role: "nova",
          text: payload.ok ? payload.answer : payload.error || "NOVA AI could not answer right now."
        }
      ]);
      setStatus(payload.ok ? `Answered by ${payload.generatedBy}${payload.model ? ` (${payload.model})` : ""}.` : "NOVA AI failed.");
      setPrompt("");
    } catch {
      setMessages((current) => [...current, { role: "nova", text: "NOVA AI could not reach the answer service." }]);
      setStatus("NOVA AI failed.");
    } finally {
      setIsWorking(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPrompt = prompt.trim();
    if (nextPrompt) await askNova(nextPrompt);
  }

  async function importFile(file?: File | null) {
    if (!file) return;
    setIsWorking(true);
      setStatus("Importing private NOVA memory...");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const response = await fetch("/api/nova/chatgpt-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ export: json })
      });
      const payload = await response.json();
      if (!payload.ok) {
        setStatus(payload.error || "Import failed.");
      } else {
        setMemoryCount((count) => count + payload.imported);
        setStatus(
          payload.importKind === "nova_reference_database"
            ? `Imported ${payload.imported} NOVA reference memory item(s).`
            : `Imported ${payload.imported} ChatGPT conversation memory item(s).`
        );
      }
    } catch {
      setStatus("Import failed. Upload ChatGPT conversations.json or a NOVA reference import JSON file.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="nova-surface rounded-lg border border-occ-line p-5 shadow-nova">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="green">OpenAI ready</StatusBadge>
            <StatusBadge tone={allowWeb ? "cyan" : "neutral"}>{allowWeb ? "Web search allowed" : "App only"}</StatusBadge>
            <StatusBadge tone={useImportedMemory ? "green" : "neutral"}>{memoryCount} memory item(s)</StatusBadge>
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-occ-cyan">NOVA AI Core</p>
          <h2 className="mt-2 text-2xl font-semibold text-occ-platinum">ChatGPT-powered NOVA assistant</h2>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Ask NOVA using live app context, optional OpenAI web search, and imported private memory. NOVA can use ChatGPT exports or NOVA reference imports, but it cannot read your private ChatGPT account directly.
          </p>
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-md border border-occ-cyan/30 bg-occ-cyan/10 text-occ-cyan">
          <BrainCircuit size={22} />
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1fr]">
        <div className="rounded-md border border-occ-line bg-occ-ink/80 p-4">
          <form onSubmit={onSubmit}>
            <label className="block text-sm text-zinc-300">
              Ask NOVA
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={5}
                placeholder="Ask about duties, planning, personal goals, or ask NOVA to search the web."
                className="focus-ring mt-2 w-full rounded-md border border-occ-line bg-occ-panel px-3 py-2 text-sm text-white placeholder:text-zinc-600"
              />
            </label>
            <button
              disabled={isWorking}
              className="focus-ring mt-3 inline-flex min-h-10 items-center gap-2 rounded-md bg-occ-cyan px-4 text-sm font-semibold text-occ-ink disabled:cursor-wait disabled:opacity-70"
            >
              {isWorking ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
              Ask NOVA
            </button>
          </form>

          <div className="mt-4 grid gap-2 text-sm text-zinc-300">
            <label className="flex items-center justify-between rounded-md border border-occ-line bg-occ-panel2 px-3 py-2">
              Allow OpenAI web search
              <input type="checkbox" checked={allowWeb} onChange={(event) => setAllowWeb(event.target.checked)} className="h-5 w-5 accent-occ-cyan" />
            </label>
            <label className="flex items-center justify-between rounded-md border border-occ-line bg-occ-panel2 px-3 py-2">
              Use imported memory
              <input type="checkbox" checked={useImportedMemory} onChange={(event) => setUseImportedMemory(event.target.checked)} className="h-5 w-5 accent-occ-cyan" />
            </label>
            <label className="flex items-center justify-between rounded-md border border-occ-line bg-occ-panel2 px-3 py-2">
              Save this NOVA exchange
              <input type="checkbox" checked={storeExchange} onChange={(event) => setStoreExchange(event.target.checked)} className="h-5 w-5 accent-occ-cyan" />
            </label>
          </div>

          <label className="focus-ring mt-4 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-occ-line bg-occ-panel2 px-3 text-sm font-semibold text-zinc-200 hover:border-occ-cyan/50 hover:text-white">
            <Upload size={16} />
            Import ChatGPT or NOVA reference JSON
            <input type="file" accept="application/json,.json" onChange={(event) => void importFile(event.target.files?.[0])} className="hidden" />
          </label>
        </div>

        <div className="rounded-md border border-occ-line bg-occ-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">Conversation</h3>
            <StatusBadge tone={isWorking ? "amber" : "green"}>{isWorking ? "Thinking" : "Ready"}</StatusBadge>
          </div>
          <div className="mt-4 max-h-[520px] space-y-3 overflow-auto pr-1">
            {messages.length ? (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={message.role === "nova" ? "rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-200" : "rounded-md bg-occ-cyan/10 p-3 text-sm text-cyan-100"}
                >
                  {message.text}
                </div>
              ))
            ) : (
              <p className="rounded-md border border-occ-line bg-occ-ink p-3 text-sm text-zinc-500">
                NOVA is ready. Imported ChatGPT conversations or NOVA reference files become private NOVA memory items after upload.
              </p>
            )}
          </div>
          {status ? <p className="mt-4 text-sm text-zinc-400">{status}</p> : null}
        </div>
      </div>
    </section>
  );
}
