import { describe, expect, it } from "vitest";

import { actionError, saveError } from "@/app/actions/action-result";

const friendlyNetworkMessage =
  "Database request failed. Supabase is configured, but the Next.js server could not reach it. Check the Supabase project status, network access, and apps/web/.env.local.";

describe("action result messages", () => {
  it("turns low-level fetch failures into an actionable data-source message", () => {
    expect(actionError("TypeError: fetch failed")).toEqual({
      data: null,
      error: friendlyNetworkMessage,
    });
    expect(saveError("ENOTFOUND skcvtzjltvthjgoafyal.supabase.co")).toEqual({
      error: { message: friendlyNetworkMessage },
    });
  });

  it("preserves domain validation messages", () => {
    expect(actionError("Create or seed a season first.")).toEqual({
      data: null,
      error: "Create or seed a season first.",
    });
  });
});
