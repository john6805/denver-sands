import type { ActionResult, SaveResponse } from "@/lib/data/league-data";

export function missingConfigError() {
  return "Supabase is not configured for the Next.js server.";
}

export function saveError(message: string): SaveResponse {
  return { error: { message } };
}

export function saveOk(): SaveResponse {
  return { error: null };
}

export function actionError<T>(message: string): ActionResult<T> {
  return { data: null, error: message };
}

export function actionOk<T>(data: T): ActionResult<T> {
  return { data, error: null };
}
