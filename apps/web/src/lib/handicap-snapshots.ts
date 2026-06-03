import { calculateHalfHandicap, type AttendanceStatus } from "@/lib/scoring";

export type SnapshotRsvp = {
  golferId: string;
  status: AttendanceStatus;
};

export type SnapshotRosterGolfer = {
  golferId: string;
  golferName: string;
  currentHandicap: number | null;
  active: boolean;
};

export type ExistingHandicapSnapshot = {
  golferId: string;
  handicap: number;
  halfHandicap: number;
};

export type HandicapSnapshotRow = {
  golferId: string;
  golferName: string;
  currentHandicap: number | null;
  snapshotHandicap: number | null;
  halfHandicap: number | null;
  status: "ready" | "snapshotted" | "missing_handicap";
};

export type HandicapSnapshotInsert = {
  season_id: string;
  golfer_id: string;
  effective_week_id: string;
  handicap: number;
  half_handicap: number;
  source: "admin";
};

export type HandicapSnapshotPlan = {
  rows: HandicapSnapshotRow[];
  inserts: HandicapSnapshotInsert[];
  blockedGolfers: HandicapSnapshotRow[];
  canSnapshot: boolean;
};

const snapshotEligibleStatuses = new Set<AttendanceStatus>([
  "confirmed",
  "played",
]);

export function shouldSnapshotAttendance(status: AttendanceStatus) {
  return snapshotEligibleStatuses.has(status);
}

export function buildHandicapSnapshotPlan(input: {
  seasonId: string;
  weeklyEventId: string;
  rsvps: SnapshotRsvp[];
  rosterGolfers: SnapshotRosterGolfer[];
  existingSnapshots: ExistingHandicapSnapshot[];
}): HandicapSnapshotPlan {
  const existingSnapshots = new Map(
    input.existingSnapshots.map((snapshot) => [snapshot.golferId, snapshot]),
  );
  const rosterGolfers = new Map(
    input.rosterGolfers.map((golfer) => [golfer.golferId, golfer]),
  );
  const eligibleGolferIds = input.rsvps
    .filter((rsvp) => shouldSnapshotAttendance(rsvp.status))
    .map((rsvp) => rsvp.golferId);

  const rows = eligibleGolferIds
    .map((golferId): HandicapSnapshotRow | null => {
      const golfer = rosterGolfers.get(golferId);

      if (!golfer || !golfer.active) {
        return null;
      }

      const existingSnapshot = existingSnapshots.get(golferId);

      if (existingSnapshot) {
        return {
          golferId,
          golferName: golfer.golferName,
          currentHandicap: golfer.currentHandicap,
          snapshotHandicap: existingSnapshot.handicap,
          halfHandicap: existingSnapshot.halfHandicap,
          status: "snapshotted",
        };
      }

      const halfHandicap = calculateHalfHandicap(golfer.currentHandicap);

      if (golfer.currentHandicap === null || halfHandicap === null) {
        return {
          golferId,
          golferName: golfer.golferName,
          currentHandicap: golfer.currentHandicap,
          snapshotHandicap: null,
          halfHandicap: null,
          status: "missing_handicap",
        };
      }

      return {
        golferId,
        golferName: golfer.golferName,
        currentHandicap: golfer.currentHandicap,
        snapshotHandicap: golfer.currentHandicap,
        halfHandicap,
        status: "ready",
      };
    })
    .filter((row): row is HandicapSnapshotRow => row !== null)
    .sort((left, right) => left.golferName.localeCompare(right.golferName));

  const blockedGolfers = rows.filter(
    (row) => row.status === "missing_handicap",
  );
  const inserts = rows
    .filter((row) => row.status === "ready")
    .map((row) => ({
      season_id: input.seasonId,
      golfer_id: row.golferId,
      effective_week_id: input.weeklyEventId,
      handicap: row.snapshotHandicap as number,
      half_handicap: row.halfHandicap as number,
      source: "admin" as const,
    }));

  return {
    rows,
    inserts,
    blockedGolfers,
    canSnapshot: blockedGolfers.length === 0,
  };
}
