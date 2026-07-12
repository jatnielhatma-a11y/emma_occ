import { errorMessage, logOperationalEvent } from "./logger";

type RetryOptions = {
  attempts?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label: string;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryableStatus(status: number) {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function jitter(ms: number) {
  return Math.round(ms * (0.85 + Math.random() * 0.3));
}

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 300;
  const maxDelayMs = options.maxDelayMs ?? 2_500;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;

      const waitMs = jitter(Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)));
      logOperationalEvent("warn", "provider_retry", {
        label: options.label,
        attempt,
        nextAttempt: attempt + 1,
        waitMs,
        error: errorMessage(error)
      });
      await delay(waitMs);
    }
  }

  throw lastError;
}

export async function resilientFetch(input: string | URL, init: RequestInit = {}, options: RetryOptions): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 8_000;

  return withRetry(
    async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(input, {
          ...init,
          signal: controller.signal
        });

        if (retryableStatus(response.status)) {
          throw new Error(`${options.label} returned retryable status ${response.status}.`);
        }

        return response;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`${options.label} timed out after ${timeoutMs}ms.`);
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    },
    options
  );
}
