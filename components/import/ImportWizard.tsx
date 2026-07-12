"use client";

import { ChangeEvent, useState } from "react";
import { ClipboardPaste, FileSpreadsheet, UploadCloud } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

type ImportResponse = {
  ok: boolean;
  importId?: string;
  summary?: {
    totalDuties: number;
    workingHours: number;
    restDays: number;
    nightShifts: number;
    lateShifts: number;
    conflicts: number;
  };
  comparison?: {
    added: unknown[];
    changed: unknown[];
    removed: unknown[];
    dateRange: { start: string | null; end: string | null };
  };
  warnings?: string[];
  error?: string;
};

export function ImportWizard() {
  const [file, setFile] = useState<File | null>(null);
  const [rosterText, setRosterText] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setResult(null);
  }

  async function uploadRoster() {
    if (!file && !rosterText.trim()) return;

    const formData = new FormData();
    if (file) formData.append("file", file);
    if (rosterText.trim()) formData.append("rosterText", rosterText.trim());
    setIsUploading(true);
    setResult(null);

    const response = await fetch("/api/import-roster", {
      method: "POST",
      body: formData
    });
    const payload = (await response.json()) as ImportResponse;
    setResult(payload);
    setIsUploading(false);
  }

  return (
    <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Roster import wizard</h2>
          <p className="text-sm text-zinc-500">Upload CSV, Excel, PDF, or roster screenshots</p>
        </div>
        <StatusBadge tone="cyan">OCR + review</StatusBadge>
      </div>

      <label className="mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-occ-line bg-occ-ink px-4 py-8 text-center transition hover:border-occ-cyan">
        <UploadCloud className="text-occ-cyan" size={32} />
        <span className="mt-3 text-sm font-medium text-white">{file ? file.name : "Choose roster file"}</span>
        <span className="mt-1 text-xs text-zinc-500">CSV, Excel, text PDF, and roster screenshots are supported. Images use OpenAI OCR when configured.</span>
        <input
          type="file"
          className="sr-only"
          accept=".csv,.xlsx,.xls,.pdf,image/*"
          onChange={onFileChange}
        />
      </label>

      <div className="mt-4 rounded-lg border border-occ-line bg-occ-ink p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <ClipboardPaste size={17} className="text-occ-cyan" />
          Paste roster text
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Use this when OCR is unavailable or you copied roster rows from another source. Include a header row when possible.
        </p>
        <textarea
          value={rosterText}
          onChange={(event) => {
            setRosterText(event.target.value);
            setResult(null);
          }}
          rows={6}
          placeholder={"Date,Start time,End time,Duty code,Duty label,Location,Notes\n2026-07-10,23:00,07:05,382G,,Utrecht,Night duty"}
          className="focus-ring mt-3 w-full resize-y rounded-md border border-occ-line bg-occ-panel p-3 text-sm text-zinc-100 placeholder:text-zinc-600"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={(!file && !rosterText.trim()) || isUploading}
          onClick={uploadRoster}
          className="focus-ring inline-flex items-center gap-2 rounded-md bg-occ-cyan px-4 py-2 font-semibold text-occ-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileSpreadsheet size={18} />
          {isUploading ? "Importing..." : "Import roster"}
        </button>
        <span className="text-sm text-zinc-500">Duties are stored privately under your Supabase user after extraction.</span>
      </div>

      {result ? (
        <div className="mt-5 rounded-lg border border-occ-line bg-occ-ink p-4">
          {result.ok ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <strong className="text-white">Import ready for review</strong>
                <StatusBadge tone={result.summary?.conflicts ? "amber" : "green"}>
                  {result.summary?.conflicts ?? 0} conflicts
                </StatusBadge>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <span className="rounded-md bg-occ-panel p-3 text-zinc-400">
                  Duties
                  <strong className="mt-1 block text-xl text-white">{result.summary?.totalDuties}</strong>
                </span>
                <span className="rounded-md bg-occ-panel p-3 text-zinc-400">
                  Nights
                  <strong className="mt-1 block text-xl text-white">{result.summary?.nightShifts}</strong>
                </span>
                <span className="rounded-md bg-occ-panel p-3 text-zinc-400">
                  Rest days
                  <strong className="mt-1 block text-xl text-white">{result.summary?.restDays}</strong>
                </span>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <span className="text-zinc-400">Added: <strong className="text-white">{result.comparison?.added.length}</strong></span>
                <span className="text-zinc-400">Changed: <strong className="text-white">{result.comparison?.changed.length}</strong></span>
                <span className="text-zinc-400">Removed: <strong className="text-white">{result.comparison?.removed.length}</strong></span>
              </div>

              {result.warnings?.length ? (
                <div className="rounded-md border border-occ-amber/40 bg-occ-amber/10 p-3 text-sm text-amber-100">
                  {result.warnings.join(" ")}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-md border border-occ-red/40 bg-occ-red/10 p-3 text-sm text-red-100">
              {result.error}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
