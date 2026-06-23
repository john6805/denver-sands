import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/leaderboard", () => ({
  getLeaderboardData: vi.fn(),
}));

import { LeaderboardTable, RawLeaderboardView } from "@/components/raw-leaderboard";
import { calculateRawLeaderboard } from "@/lib/leaderboard";

describe("raw leaderboard rendering", () => {
  it("renders public official standings from leaderboard calculation rows", () => {
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
        },
      ],
    });

    const html = renderToStaticMarkup(<LeaderboardTable rows={rows} />);

    expect(html).toContain("Zach");
    expect(html).toContain("Official/proj pts");
    expect(html).toContain("Raw pts");
    expect(html).toContain("Raw rank");
    expect(html).not.toContain("Beer");
    expect(html).not.toContain("beer");
    expect(html).toContain(">0<");
    expect(html).toContain(">23<");
  });

  it("does not render admin result or correction controls", () => {
    const html = renderToStaticMarkup(
      <LeaderboardTable
        rows={calculateRawLeaderboard({
          golfers: [{ id: "zach", displayName: "Zach" }],
          weeks: [{ id: "w1", status: "completed" }],
          results: [],
        })}
      />,
    );

    expect(html).not.toContain("Save results");
    expect(html).not.toContain("Save correction");
    expect(html).not.toContain("Lock week");
    expect(html).not.toContain("Correction reason");
    expect(html).not.toContain("Refresh");
  });

  it("keeps the client view importable without server action setup", () => {
    expect(RawLeaderboardView).toBeTypeOf("function");
  });
});
