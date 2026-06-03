"use server";

import { getBreakdownData } from "@/app/actions/weekly-results";
import type { ActionResult, LeaderboardData } from "@/lib/data/league-data";

export async function getLeaderboardData(): Promise<ActionResult<LeaderboardData>> {
  return getBreakdownData();
}
