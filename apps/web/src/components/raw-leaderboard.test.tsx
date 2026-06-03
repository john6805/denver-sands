import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/leaderboard", () => ({
  getLeaderboardData: vi.fn(),
}));

import { LeaderboardTable, RawLeaderboardView } from "@/components/raw-leaderboard";
import { calculateRawLeaderboard } from "@/lib/leaderboard";

describe("raw leaderboard rendering", () => {
  it("calculates and renders raw leaderboard rows", () => {
    const rows = calculateRawLeaderboard({
      golfers: [{ id: "zach", displayName: "Zach" }],
      weeks: [{ id: "w1", status: "completed" }],
      results: [
        {
          id: "result-1",
          weeklyEventId: "w1",
          golferId: "zach",
          attendanceStatus: "played",
          matchResult: "won",
          handicapSnapshot: 10,
          grossScore: 44,
          netScore: 39,
          putts: 16,
          beerCount: 1,
        },
      ],
    });

    const html = renderToStaticMarkup(<LeaderboardTable rows={rows} />);

    expect(html).toContain("Zach");
    expect(html).toContain("Raw pts");
    expect(html).toContain("Pts + beer");
    expect(html).toContain(">23<");
    expect(html).toContain(">24<");
  });

  it("keeps the client view importable without server action setup", () => {
    expect(RawLeaderboardView).toBeTypeOf("function");
  });
});
