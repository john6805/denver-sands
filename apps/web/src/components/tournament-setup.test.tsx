import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/tournament", () => ({
  createTournament: vi.fn(),
  getTournamentData: vi.fn(),
  saveTournamentRoundResults: vi.fn(),
}));

import { TournamentSetupView } from "@/components/tournament-setup";

describe("tournament setup rendering", () => {
  it("keeps the tournament setup view importable", () => {
    expect(TournamentSetupView).toBeTypeOf("function");
  });

  it("renders the loading state without weekly result copy", () => {
    const html = renderToStaticMarkup(<TournamentSetupView />);

    expect(html).toContain("Loading tournament setup");
    expect(html).not.toContain("Weekly Point Breakdown");
    expect(html).not.toContain("Save results");
  });
});
