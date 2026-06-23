import type { ActionResult, SaveResponse } from "@/lib/data/league-data";

const databaseNetworkError =
  "Database request failed. Supabase is configured, but the Next.js server could not reach it. Check the Supabase project status, network access, and apps/web/.env.local.";

function userFacingMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("econnrefused") ||
    normalized.includes("enotfound") ||
    normalized.includes("etimedout")
  ) {
    return databaseNetworkError;
  }

  return message;
}

export function missingConfigError() {
  return "Supabase is not configured for the Next.js server.";
}

export function saveError(message: string): SaveResponse {
  return { error: { message: userFacingMessage(message) } };
}

export function saveOk(): SaveResponse {
  return { error: null };
}

export function actionError<T>(message: string): ActionResult<T> {
  return { data: null, error: userFacingMessage(message) };
}

export function actionOk<T>(data: T): ActionResult<T> {
  return { data, error: null };
}
