"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Flag, Loader2, Plus, Save } from "lucide-react";

import {
  createTournament,
  getTournamentData,
  saveTournamentRoundResults,
} from "@/app/actions/tournament";
import { Button } from "@/components/ui/button";
import {
  calculatePointsChampion,
  calculateTournamentChampion,
  calculateTournamentStandings,
  buildTournamentCreate,
  buildTournamentResultUpserts,
  tournamentStatusOptions,
  type ChampionResult,
  type TournamentStandingRow,
} from "@/lib/tournament";
import { calculateRawLeaderboard } from "@/lib/leaderboard";
import { useActionData } from "@/lib/use-action-data";
import type {
  AdminIssue,
} from "@/lib/admin-season";
import type {
  Course,
  Golfer,
  SeasonGolfer,
  Tournament,
  TournamentData,
  TournamentRound,
  TournamentRoundResult,
} from "@/lib/data/league-data";

type SaveAction = () => PromiseLike<{ error: { message: string } | null }>;

function issueText(issues: AdminIssue[]) {
  return issues.map((item) => item.message).join(" ");
}

function inputClassName() {
  return "h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs";
}

function selectClassName() {
  return "h-9 w-full rounded-md border bg-background px-2 text-sm shadow-xs";
}

function FieldError({ issues }: { issues: AdminIssue[] }) {
  if (issues.length === 0) {
    return null;
  }

  return <p className="text-xs text-destructive">{issueText(issues)}</p>;
}

export function TournamentSetupView() {
  const { data, loading, error, reload } =
    useActionData<TournamentData>(getTournamentData);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");

  async function save(key: string, action: SaveAction) {
    setSaving(key);
    setMessage(null);

    const response = await action();

    if (response.error) {
      setMessage(response.error.message);
    } else {
      setMessage("Saved tournament data.");
      await reload();
    }

    setSaving(null);
  }

  const selectedTournament =
    data?.tournaments.find((tournament) => tournament.id === selectedTournamentId) ??
    data?.tournaments[0];

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading tournament setup
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-lg border border-dashed p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 size-5 text-destructive" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold">Tournament Setup</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {error ?? "Tournament data is not available."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {data.season.name}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            End-of-Season Tournament
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Set up the separate two-round, 18-hole tournament and enter net
            scores and putts without affecting regular-season weekly points.
          </p>
        </div>
        {message ? (
          <p className="rounded-lg border px-3 py-2 text-sm">{message}</p>
        ) : null}
      </header>

      <NewTournamentForm data={data} saving={saving} onSave={save} />

      {data.tournaments.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-2">
              <Flag className="size-5" aria-hidden="true" />
              <h2 className="text-xl font-semibold">Result Entry</h2>
            </div>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Tournament</span>
              <select
                className={selectClassName()}
                value={selectedTournament?.id ?? ""}
                onChange={(event) => setSelectedTournamentId(event.target.value)}
              >
                {data.tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedTournament ? (
            <TournamentResultTables
              tournament={selectedTournament}
              data={data}
              saving={saving}
              onSave={save}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function NewTournamentForm({
  data,
  saving,
  onSave,
}: {
  data: TournamentData;
  saving: string | null;
  onSave: (key: string, action: SaveAction) => Promise<void>;
}) {
  const [name, setName] = useState("End-of-Season Tournament");
  const [courseId, setCourseId] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [status, setStatus] = useState("planned");
  const [round1Date, setRound1Date] = useState("");
  const [round2Date, setRound2Date] = useState("");
  const [issues, setIssues] = useState<AdminIssue[]>([]);

  async function submit() {
    const create = buildTournamentCreate({
      name,
      course_id: courseId,
      starts_on: startsOn,
      ends_on: endsOn,
      status,
      round_1_play_date: round1Date,
      round_2_play_date: round2Date,
    });

    if (!create.ok) {
      setIssues(create.issues);
      return;
    }

    setIssues([]);
    await onSave("new-tournament", () =>
      createTournament(data.season.id, create.values),
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Plus className="size-5" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Create Tournament</h2>
      </div>
      <div className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            className={inputClassName()}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Course</span>
          <select
            className={selectClassName()}
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">Course TBD</option>
            {data.courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Start</span>
          <input
            className={inputClassName()}
            type="date"
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">End</span>
          <input
            className={inputClassName()}
            type="date"
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Status</span>
          <select
            className={selectClassName()}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {tournamentStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={submit} disabled={saving === "new-tournament"}>
          <Plus aria-hidden="true" />
          Create
        </Button>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Round 1 date</span>
          <input
            className={inputClassName()}
            type="date"
            value={round1Date}
            onChange={(event) => setRound1Date(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Round 2 date</span>
          <input
            className={inputClassName()}
            type="date"
            value={round2Date}
            onChange={(event) => setRound2Date(event.target.value)}
          />
        </label>
        <div className="lg:col-span-4">
          <FieldError issues={issues} />
          <p className="text-xs text-muted-foreground">
            Tournament rounds are always 18 holes and use full-handicap
            tournament context, separate from weekly half-handicap play.
          </p>
        </div>
      </div>
    </section>
  );
}

function TournamentResultTables({
  tournament,
  data,
  saving,
  onSave,
}: {
  tournament: Tournament;
  data: TournamentData;
  saving: string | null;
  onSave: (key: string, action: SaveAction) => Promise<void>;
}) {
  const rounds = data.tournamentRounds
    .filter((round) => round.tournament_id === tournament.id)
    .sort((left, right) => left.round_number - right.round_number);
  const standings = calculateTournamentStandings({
    golfers: data.golfers,
    rounds,
    results: data.tournamentRoundResults,
  });
  const leaderboardRows = calculateRawLeaderboard({
    golfers: data.golfers.map((golfer) => ({
      id: golfer.id,
      displayName: golfer.display_name,
      active: golfer.active,
    })),
    weeks: data.weeklyEvents.map((week) => ({
      id: week.id,
      status: week.status,
    })),
    results: data.weeklyResults.map((result) => ({
      id: result.id,
      weeklyEventId: result.weekly_event_id,
      golferId: result.golfer_id,
      attendanceStatus: result.attendance_status,
      matchResult: result.match_result,
      handicapSnapshot: result.handicap_snapshot,
      grossScore: result.gross_score,
      netScore: result.net_score,
      putts: result.putts,
    })),
    dropLowestWeekCount: data.season.drop_lowest_week_count,
  });
  const champions = [
    calculateTournamentChampion(standings),
    calculatePointsChampion(leaderboardRows),
  ];
  const courseName = courseNameFor(data.courses, tournament.course_id);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <p className="font-semibold">{tournament.name}</p>
        <p className="text-sm text-muted-foreground">
          {courseName} · {tournament.status} ·{" "}
          {tournament.starts_on ?? "date TBD"}
          {tournament.ends_on ? ` to ${tournament.ends_on}` : ""}
        </p>
      </div>
      {rounds.map((round) => (
        <TournamentRoundEntry
          key={round.id}
          round={round}
          data={data}
          saving={saving}
          onSave={onSave}
        />
      ))}
      <TournamentStandingsTable standings={standings} />
      <ChampionsPreview champions={champions} />
    </div>
  );
}

function ChampionsPreview({ champions }: { champions: ChampionResult[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {champions.map((champion) => (
        <section key={champion.title} className="rounded-lg border p-4">
          <h3 className="font-semibold">{champion.title}</h3>
          {champion.winners.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No eligible winner yet
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {champion.winners.map((winner) => (
                <div key={`${champion.title}-${winner.golferId}`}>
                  <p className="font-medium">{winner.golferName}</p>
                  <p className="text-sm text-muted-foreground">{winner.detail}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function TournamentStandingsTable({
  standings,
}: {
  standings: TournamentStandingRow[];
}) {
  if (standings.length === 0) {
    return (
      <section className="rounded-lg border border-dashed p-4">
        <h3 className="font-semibold">Tournament Standings</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter both rounds of net scores and putts before standings can be
          calculated.
        </p>
      </section>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Place</th>
            <th className="px-3 py-2 font-medium">Golfer</th>
            <th className="px-3 py-2 text-right font-medium">Total net</th>
            <th className="px-3 py-2 text-right font-medium">Total putts</th>
            <th className="px-3 py-2 text-right font-medium">Final net</th>
            <th className="px-3 py-2 text-right font-medium">Final putts</th>
            <th className="px-3 py-2 text-right font-medium">Tourney pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => (
            <tr key={row.golferId} className="border-t">
              <td className="px-3 py-2">{row.place}</td>
              <td className="px-3 py-2 font-medium">{row.golferName}</td>
              <td className="px-3 py-2 text-right">{row.totalNetScore}</td>
              <td className="px-3 py-2 text-right">{row.totalPutts}</td>
              <td className="px-3 py-2 text-right">
                {row.finalRoundNetScore}
              </td>
              <td className="px-3 py-2 text-right">{row.finalRoundPutts}</td>
              <td className="px-3 py-2 text-right">
                {row.tournamentPoints}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function courseNameFor(courses: Course[], courseId: string | null) {
  return courses.find((course) => course.id === courseId)?.name ?? "Course TBD";
}

type ResultEntryRow = {
  golferId: string;
  golferName: string;
  handicapSnapshot: string;
  netScore: string;
  putts: string;
};

function rowsForRound(input: {
  golfers: Golfer[];
  seasonGolfers: SeasonGolfer[];
  results: TournamentRoundResult[];
}) {
  const resultByGolfer = new Map(
    input.results.map((result) => [result.golfer_id, result]),
  );

  return input.golfers
    .filter((golfer) => golfer.active)
    .map((golfer): ResultEntryRow => {
      const result = resultByGolfer.get(golfer.id);
      const seasonGolfer = input.seasonGolfers.find(
        (item) => item.golfer_id === golfer.id,
      );

      return {
        golferId: golfer.id,
        golferName: golfer.display_name,
        handicapSnapshot:
          result?.handicap_snapshot?.toString() ??
          seasonGolfer?.current_handicap?.toString() ??
          "",
        netScore: result?.net_score?.toString() ?? "",
        putts: result?.putts?.toString() ?? "",
      };
    });
}

function TournamentRoundEntry({
  round,
  data,
  saving,
  onSave,
}: {
  round: TournamentRound;
  data: TournamentData;
  saving: string | null;
  onSave: (key: string, action: SaveAction) => Promise<void>;
}) {
  const stateKey = [
    round.id,
    data.tournamentRoundResults
      .filter((result) => result.tournament_round_id === round.id)
      .map((result) =>
        [
          result.golfer_id,
          result.handicap_snapshot ?? "",
          result.net_score ?? "",
          result.putts ?? "",
        ].join(":"),
      )
      .join("|"),
  ].join("::");

  return (
    <TournamentRoundFields
      key={stateKey}
      round={round}
      data={data}
      saving={saving}
      onSave={onSave}
    />
  );
}

function TournamentRoundFields({
  round,
  data,
  saving,
  onSave,
}: {
  round: TournamentRound;
  data: TournamentData;
  saving: string | null;
  onSave: (key: string, action: SaveAction) => Promise<void>;
}) {
  const [rows, setRows] = useState<ResultEntryRow[]>(() =>
    rowsForRound({
      golfers: data.golfers,
      seasonGolfers: data.seasonGolfers,
      results: data.tournamentRoundResults.filter(
        (result) => result.tournament_round_id === round.id,
      ),
    }),
  );
  const [issues, setIssues] = useState<AdminIssue[]>([]);
  const saveKey = `round-${round.id}`;
  const courseName = useMemo(
    () => courseNameFor(data.courses, round.course_id),
    [data.courses, round.course_id],
  );

  function updateRow(
    golferId: string,
    field: keyof Omit<ResultEntryRow, "golferId" | "golferName">,
    value: string,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.golferId === golferId ? { ...row, [field]: value } : row,
      ),
    );
  }

  async function submit() {
    const built = buildTournamentResultUpserts(
      rows.map((row) => ({
        golfer_id: row.golferId,
        handicap_snapshot: row.handicapSnapshot,
        net_score: row.netScore,
        putts: row.putts,
      })),
    );

    if (!built.ok) {
      setIssues(built.issues);
      return;
    }

    setIssues([]);
    await onSave(saveKey, () =>
      saveTournamentRoundResults(round.id, built.values),
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Round {round.round_number}</h3>
          <p className="text-sm text-muted-foreground">
            {round.play_date ?? "Date TBD"} · {courseName} · {round.holes} holes
          </p>
        </div>
        <Button onClick={submit} disabled={saving === saveKey}>
          <Save aria-hidden="true" />
          Save round
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Golfer</th>
              <th className="px-3 py-2 font-medium">Full handicap</th>
              <th className="px-3 py-2 font-medium">Net score</th>
              <th className="px-3 py-2 font-medium">Putts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.golferId} className="border-t">
                <td className="px-3 py-2 font-medium">{row.golferName}</td>
                <td className="px-3 py-2">
                  <input
                    className={inputClassName()}
                    inputMode="decimal"
                    value={row.handicapSnapshot}
                    onChange={(event) =>
                      updateRow(
                        row.golferId,
                        "handicapSnapshot",
                        event.target.value,
                      )
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className={inputClassName()}
                    inputMode="numeric"
                    value={row.netScore}
                    onChange={(event) =>
                      updateRow(row.golferId, "netScore", event.target.value)
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className={inputClassName()}
                    inputMode="numeric"
                    value={row.putts}
                    onChange={(event) =>
                      updateRow(row.golferId, "putts", event.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FieldError issues={issues} />
    </div>
  );
}
