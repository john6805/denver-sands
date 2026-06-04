import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/audit-trail", () => ({
  getAuditTrailData: vi.fn(),
}));

import {
  AuditTable,
  AuditTrailContent,
  AuditTrailBrowser,
} from "@/components/audit-trail-browser";

const seasonLookup = new Map([["season-1", "2026 Denver Sands"]]);
const weekLookup = new Map([["week-1", "W01 - 2026-05-12"]]);

describe("audit trail browser rendering", () => {
  it("renders audit entries with before and after summaries", () => {
    const html = renderToStaticMarkup(
      <AuditTable
        seasonLookup={seasonLookup}
        weekLookup={weekLookup}
        events={[
          {
            id: "audit-1",
            actor_id: null,
            season_id: "season-1",
            weekly_event_id: "week-1",
            entity_type: "weekly_results",
            entity_id: "result-entity-id",
            action: "corrected",
            before_json: [{ golfer_id: "zach", net_score: 40 }],
            after_json: [{ golfer_id: "zach", net_score: 39 }],
            reason: "18Birdies correction",
            created_at: "2026-06-04T12:00:00Z",
          },
        ]}
      />,
    );

    expect(html).toContain("2026 Denver Sands");
    expect(html).toContain("W01 - 2026-05-12");
    expect(html).toContain("weekly_results");
    expect(html).toContain("corrected");
    expect(html).toContain("18Birdies correction");
    expect(html).toContain("net_score");
  });

  it("renders an empty read-only state", () => {
    const html = renderToStaticMarkup(
      <AuditTable events={[]} seasonLookup={seasonLookup} weekLookup={weekLookup} />,
    );

    expect(html).toContain("No audit entries");
    expect(html).not.toContain("Save");
    expect(html).not.toContain("Delete");
    expect(html).not.toContain("Edit");
  });

  it("renders filter controls without mutation controls", () => {
    const html = renderToStaticMarkup(
      <AuditTrailContent
        data={{
          seasons: [
            {
              id: "season-1",
              name: "2026 Denver Sands",
              year: 2026,
              drop_lowest_week_count: 2,
            },
          ],
          weeklyEvents: [
            {
              id: "week-1",
              week_code: "W01",
              play_date: "2026-05-12",
              status: "locked",
            },
          ],
          auditEvents: [],
        }}
      />,
    );

    expect(html).toContain("Audit Trail");
    expect(html).toContain("Season");
    expect(html).toContain("Week");
    expect(html).toContain("Entity");
    expect(html).toContain("Action");
    expect(html).not.toContain("Save");
    expect(html).not.toContain("Delete");
  });

  it("keeps the client browser importable without server action setup", () => {
    expect(AuditTrailBrowser).toBeTypeOf("function");
  });
});
