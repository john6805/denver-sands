"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertCircle, History, Loader2 } from "lucide-react";

import { getAuditTrailData } from "@/app/actions/audit-trail";
import { useActionData } from "@/lib/use-action-data";
import type {
  AdminAuditEvent,
  AuditTrailData,
  SeasonSummary,
  WeeklyEventSummary,
} from "@/lib/data/league-data";

function selectClassName() {
  return "h-9 w-full rounded-md border bg-background px-2 text-sm shadow-xs";
}

function formatJson(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return "-";
  }

  const text = JSON.stringify(value);

  if (!text) {
    return "-";
  }

  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function labelFor(
  id: string | null,
  lookup: Map<string, string>,
  fallback: string,
) {
  if (!id) {
    return fallback;
  }

  return lookup.get(id) ?? id.slice(0, 8);
}

export function AuditTrailBrowser() {
  const { data, loading, error } = useActionData(getAuditTrailData);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading audit trail
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-lg border border-dashed p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 size-5 text-destructive" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-semibold">Audit Trail</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {error ?? "Audit trail data is not available."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return <AuditTrailContent data={data} />;
}

export function AuditTrailContent({ data }: { data: AuditTrailData }) {
  const [seasonId, setSeasonId] = useState(data.seasons[0]?.id ?? "all");
  const [weekId, setWeekId] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [action, setAction] = useState("all");
  const seasonLookup = useMemo(
    () => new Map(data.seasons.map((season) => [season.id, season.name])),
    [data.seasons],
  );
  const weekLookup = useMemo(
    () =>
      new Map(
        data.weeklyEvents.map((week) => [
          week.id,
          `${week.week_code} - ${week.play_date}`,
        ]),
      ),
    [data.weeklyEvents],
  );
  const entityTypes = useMemo(
    () =>
      Array.from(new Set(data.auditEvents.map((event) => event.entity_type))).sort(),
    [data.auditEvents],
  );
  const actions = useMemo(
    () => Array.from(new Set(data.auditEvents.map((event) => event.action))).sort(),
    [data.auditEvents],
  );
  const visibleEvents = data.auditEvents.filter((event) => {
    return (
      (seasonId === "all" || event.season_id === seasonId) &&
      (weekId === "all" || event.weekly_event_id === weekId) &&
      (entityType === "all" || event.entity_type === entityType) &&
      (action === "all" || event.action === action)
    );
  });

  return (
    <div className="space-y-6">
      <header className="border-b pb-6">
        <div className="flex items-center gap-2">
          <History className="size-5" aria-hidden="true" />
          <p className="text-sm font-medium text-muted-foreground">Admin</p>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Audit Trail
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Read-only history for locked-week corrections, locks, match
          generation events, and future overrides.
        </p>
      </header>

      <AuditFilters
        seasons={data.seasons}
        weeklyEvents={data.weeklyEvents}
        entityTypes={entityTypes}
        actions={actions}
        values={{ seasonId, weekId, entityType, action }}
        onChange={{ setSeasonId, setWeekId, setEntityType, setAction }}
      />

      <AuditTable
        events={visibleEvents}
        seasonLookup={seasonLookup}
        weekLookup={weekLookup}
      />
    </div>
  );
}

function AuditFilters({
  seasons,
  weeklyEvents,
  entityTypes,
  actions,
  values,
  onChange,
}: {
  seasons: SeasonSummary[];
  weeklyEvents: WeeklyEventSummary[];
  entityTypes: string[];
  actions: string[];
  values: {
    seasonId: string;
    weekId: string;
    entityType: string;
    action: string;
  };
  onChange: {
    setSeasonId: (value: string) => void;
    setWeekId: (value: string) => void;
    setEntityType: (value: string) => void;
    setAction: (value: string) => void;
  };
}) {
  return (
    <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
      <label className="space-y-1 text-sm">
        <span className="font-medium">Season</span>
        <select
          className={selectClassName()}
          value={values.seasonId}
          onChange={(event) => onChange.setSeasonId(event.target.value)}
        >
          <option value="all">All seasons</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Week</span>
        <select
          className={selectClassName()}
          value={values.weekId}
          onChange={(event) => onChange.setWeekId(event.target.value)}
        >
          <option value="all">All weeks</option>
          {weeklyEvents.map((week) => (
            <option key={week.id} value={week.id}>
              {week.week_code} - {week.play_date}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Entity</span>
        <select
          className={selectClassName()}
          value={values.entityType}
          onChange={(event) => onChange.setEntityType(event.target.value)}
        >
          <option value="all">All entities</option>
          {entityTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Action</span>
        <select
          className={selectClassName()}
          value={values.action}
          onChange={(event) => onChange.setAction(event.target.value)}
        >
          <option value="all">All actions</option>
          {actions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

export function AuditTable({
  events,
  seasonLookup,
  weekLookup,
}: {
  events: AdminAuditEvent[];
  seasonLookup: Map<string, string>;
  weekLookup: Map<string, string>;
}) {
  if (events.length === 0) {
    return (
      <section className="rounded-lg border border-dashed p-6">
        <h2 className="font-semibold">No audit entries</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Corrections, locks, rerolls, published matchups, and overrides will
          appear here as those flows create audit events.
        </p>
      </section>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[1180px] text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="px-3 py-2 font-medium">When</th>
            <th className="px-3 py-2 font-medium">Season</th>
            <th className="px-3 py-2 font-medium">Week</th>
            <th className="px-3 py-2 font-medium">Actor</th>
            <th className="px-3 py-2 font-medium">Action</th>
            <th className="px-3 py-2 font-medium">Target</th>
            <th className="px-3 py-2 font-medium">Before</th>
            <th className="px-3 py-2 font-medium">After</th>
            <th className="px-3 py-2 font-medium">Reason</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-t align-top">
              <td className="px-3 py-2">{event.created_at}</td>
              <td className="px-3 py-2">
                {labelFor(event.season_id, seasonLookup, "No season")}
              </td>
              <td className="px-3 py-2">
                {event.weekly_event_id ? (
                  <Link className="underline" href="/weekly-results">
                    {labelFor(event.weekly_event_id, weekLookup, "Week")}
                  </Link>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-3 py-2">
                {event.actor_id ? event.actor_id.slice(0, 8) : "system"}
              </td>
              <td className="px-3 py-2">{event.action}</td>
              <td className="px-3 py-2">
                <span className="block font-medium">{event.entity_type}</span>
                <span className="text-xs text-muted-foreground">
                  {event.entity_id.slice(0, 8)}
                </span>
              </td>
              <td className="px-3 py-2">
                <code className="text-xs">{formatJson(event.before_json)}</code>
              </td>
              <td className="px-3 py-2">
                <code className="text-xs">{formatJson(event.after_json)}</code>
              </td>
              <td className="px-3 py-2">{event.reason ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
