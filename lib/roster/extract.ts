import { parseRosterText } from "./core";
import type { NormalizedDuty } from "./types";

export type ExtractRosterResult = {
  duties: NormalizedDuty[];
  extractor: "csv" | "xlsx" | "pdf" | "image" | "text";
  warnings: string[];
};

const CSV_TYPES = new Set(["text/csv", "application/csv", "text/plain", ""]);
const XLSX_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel"
]);

export function validateRosterFile(file: File) {
  const maxSizeBytes = 15 * 1024 * 1024;
  const allowed =
    CSV_TYPES.has(file.type) ||
    XLSX_TYPES.has(file.type) ||
    file.type === "application/pdf" ||
    file.type.startsWith("image/");

  if (!allowed) {
    throw new Error("Unsupported file type. Upload CSV, Excel, PDF, or an image roster.");
  }

  if (file.size > maxSizeBytes) {
    throw new Error("Roster files must be smaller than 15 MB.");
  }
}

function stripCodeFence(text: string) {
  return text
    .trim()
    .replace(/^```(?:csv|text)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function normalizeExtractedRosterText(text: string) {
  const cleaned = stripCodeFence(text);
  if (/date\s*,/i.test(cleaned)) return cleaned;

  return `Date,Start time,End time,Duty code,Duty label,Location,Notes\n${cleaned}`;
}

export function extractRosterText(text: string, sourceFile = "manual-roster-text"): ExtractRosterResult {
  const normalizedText = normalizeExtractedRosterText(text);
  return {
    duties: parseRosterText(normalizedText, sourceFile),
    extractor: "text",
    warnings: []
  };
}

function imageMimeType(file: File) {
  if (file.type) return file.type;
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}

function openAiOutputText(payload: any) {
  if (typeof payload.output_text === "string") return payload.output_text;

  const content = payload.output?.flatMap((item: any) => item.content ?? []) ?? [];
  const textBlocks = content
    .map((item: any) => item.text ?? item.output_text ?? "")
    .filter((value: string) => value.trim().length > 0);

  return textBlocks.join("\n");
}

async function extractImageWithOpenAi(file: File): Promise<ExtractRosterResult> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      duties: [],
      extractor: "image",
      warnings: ["Image OCR needs OPENAI_API_KEY. Paste roster text in the manual text box or configure OpenAI OCR."]
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
  const dataUrl = `data:${imageMimeType(file)};base64,${bytes}`;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_OCR_MODEL || process.env.OPENAI_MODEL || "gpt-5.2",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Extract this roster screenshot into CSV only. Use exactly these headers: Date,Start time,End time,Duty code,Duty label,Location,Notes. Use YYYY-MM-DD dates when visible. Preserve original duty codes. Use blank cells for missing values. Do not add commentary."
            },
            {
              type: "input_image",
              image_url: dataUrl
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    return {
      duties: [],
      extractor: "image",
      warnings: [`Image OCR failed with status ${response.status}. Paste roster text in the manual text box and import again.`]
    };
  }

  const payload = await response.json();
  const extractedText = normalizeExtractedRosterText(openAiOutputText(payload));
  const duties = parseRosterText(extractedText, file.name);

  return {
    duties,
    extractor: "image",
    warnings: duties.length ? ["Image OCR completed. Review extracted duties before calendar sync."] : ["Image OCR returned no roster rows."]
  };
}

export async function extractRosterFile(file: File): Promise<ExtractRosterResult> {
  validateRosterFile(file);

  if (CSV_TYPES.has(file.type) || file.name.toLowerCase().endsWith(".csv")) {
    const text = await file.text();
    return {
      duties: parseRosterText(text, file.name),
      extractor: "csv",
      warnings: []
    };
  }

  if (XLSX_TYPES.has(file.type) || /\.(xlsx|xls)$/i.test(file.name)) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(firstSheet);
    return {
      duties: parseRosterText(csv, file.name),
      extractor: "xlsx",
      warnings: []
    };
  }

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await pdfParse(buffer);
    return {
      duties: parseRosterText(parsed.text, file.name),
      extractor: "pdf",
      warnings: ["PDF extraction depends on table-like text. Scanned PDFs should be imported as images in the OCR phase."]
    };
  }

  return extractImageWithOpenAi(file);
}
