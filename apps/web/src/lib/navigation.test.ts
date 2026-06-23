import { describe, expect, it } from "vitest";

import { adminNavItems, primaryNavItems } from "@/lib/navigation";

describe("navigation", () => {
  it("only exposes implemented application routes", () => {
    const hrefs = [...primaryNavItems, ...adminNavItems].map((item) => item.href);

    expect(hrefs).toEqual([
      "/leaderboard",
      "/admin",
      "/match-generator",
      "/weekly-results",
      "/handicap-history",
      "/tournament",
      "/awards-sanctions",
      "/admin/audit",
    ]);
    expect(hrefs).not.toContain("/login");
  });
});
