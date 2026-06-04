import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/leaderboard", () => ({
  getLeaderboardData: vi.fn(),
}));

import { AwardsSanctionsPreview } from "@/components/awards-sanctions-preview";
import { calculateAwardMetrics } from "@/lib/awards";

describe("awards and sanctions preview rendering", () => {
  it("renders award metric output without payout copy", () => {
    const metrics = calculateAwardMetrics({
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
    const html = renderToStaticMarkup(
      <table>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.id}>
              <td>{metric.title}</td>
              <td>{metric.winners.map((winner) => winner.golferName).join(", ")}</td>
              <td>{metric.winners.map((winner) => winner.detail).join(" ")}</td>
            </tr>
          ))}
        </tbody>
      </table>,
    );

    expect(html).toContain("MVP");
    expect(html).toContain("Going Low");
    expect(html).toContain("Zach");
    expect(html).toContain("Week w1");
    expect(html).not.toContain("Payout");
  });

  it("keeps the client preview importable without server action setup", () => {
    expect(AwardsSanctionsPreview).toBeTypeOf("function");
  });
});
