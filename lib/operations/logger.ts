type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function redact(value: unknown): unknown {
  if (typeof value === "string") {
    if (/token|secret|key|authorization|password/i.test(value)) return "[redacted]";
    return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  }

  if (Array.isArray(value)) return value.map(redact);

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        /token|secret|key|authorization|password/i.test(key) ? "[redacted]" : redact(entry)
      ])
    );
  }

  return value;
}

export function logOperationalEvent(level: LogLevel, event: string, fields: LogFields = {}) {
  const safeFields = redact(fields);
  const payload = {
    level,
    event,
    at: new Date().toISOString(),
    ...(safeFields && typeof safeFields === "object" && !Array.isArray(safeFields) ? safeFields : {})
  };

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
