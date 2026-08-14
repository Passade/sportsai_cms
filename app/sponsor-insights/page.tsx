"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import { Client, Databases, Models, Query } from "appwrite";
import { useCallback, useEffect, useMemo, useState } from "react";

type RangeDays = 7 | 30 | 90;
type SponsorPlacement = "home_banner" | "live" | "vod";
type SponsorEventKind =
  | "impression"
  | "click"
  | "qualified_view"
  | "view_session";

type AnalyticsBatchDocument = Models.Document & {
  day?: string;
  eventCount?: number;
  source?: string;
  payload?: string;
};

type SponsorEvent = {
  id?: string;
  kind?: SponsorEventKind;
  placement?: SponsorPlacement;
  bannerId?: string;
  contentId?: string;
  sponsorName?: string;
  campaignId?: string;
  campaignName?: string;
  federation?: string;
  division?: string;
  sport?: string;
  matchTitle?: string;
  viewSeconds?: number;
  sessionId?: string;
  occurredAt?: string;
};

type GroupMetric = {
  key: string;
  label: string;
  views: number;
  impressions: number;
  clicks: number;
  viewSeconds: number;
  sessionIds: Set<string>;
};

type MatchMetric = GroupMetric & {
  placement: "live" | "vod";
  contentId: string;
  federation: string;
  division: string;
  sport: string;
  matchTitle: string;
};

type CampaignMetric = GroupMetric & {
  sponsorName: string;
  campaignName: string;
  campaignId: string;
};

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
const analyticsCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_SPONSOR_ANALYTICS_COLLECTION_ID || "";

const client = new Client();

if (endpoint && projectId) {
  client.setEndpoint(endpoint).setProject(projectId);
}

const databases = new Databases(client);

function dayString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getRange(rangeDays: RangeDays) {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (rangeDays - 1));

  return {
    from: dayString(from),
    to: dayString(to),
  };
}

function parseEvents(document: AnalyticsBatchDocument): SponsorEvent[] {
  try {
    const parsed = JSON.parse(String(document.payload || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return "0.00%";
  return `${((numerator / denominator) * 100).toFixed(2)}%`;
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
  }

  return `${remainingSeconds}s`;
}

function downloadCsv(rows: string[][], filename: string) {
  const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function emptyGroup(key: string, label: string): GroupMetric {
  return {
    key,
    label,
    views: 0,
    impressions: 0,
    clicks: 0,
    viewSeconds: 0,
    sessionIds: new Set<string>(),
  };
}

export default function SponsorInsightsPage() {
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [batches, setBatches] = useState<AnalyticsBatchDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSponsor, setSelectedSponsor] = useState("all");
  const [selectedFederation, setSelectedFederation] = useState("all");
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedPlacement, setSelectedPlacement] = useState<"all" | SponsorPlacement>("all");
  const [matchSearch, setMatchSearch] = useState("");

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!databaseId || !analyticsCollectionId) {
        throw new Error("Missing sponsor analytics Appwrite configuration.");
      }

      const { from, to } = getRange(rangeDays);
      const documents: AnalyticsBatchDocument[] = [];
      const limit = 100;
      let offset = 0;

      while (true) {
        const result = await databases.listDocuments<AnalyticsBatchDocument>(
          databaseId,
          analyticsCollectionId,
          [
            Query.greaterThanEqual("day", from),
            Query.lessThanEqual("day", to),
            Query.orderDesc("day"),
            Query.limit(limit),
            Query.offset(offset),
          ]
        );

        documents.push(...result.documents);
        offset += result.documents.length;

        if (result.documents.length < limit || offset >= result.total) {
          break;
        }
      }

      setBatches(documents);
    } catch (loadError) {
      setBatches([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load sponsor analytics."
      );
    } finally {
      setLoading(false);
    }
  }, [rangeDays]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const allEvents = useMemo(() => {
    const seenEventIds = new Set<string>();
    const events: SponsorEvent[] = [];

    for (const batch of batches) {
      for (const event of parseEvents(batch)) {
        const eventId = String(event.id || "");

        if (eventId && seenEventIds.has(eventId)) continue;
        if (eventId) seenEventIds.add(eventId);

        events.push({
          ...event,
          placement: event.placement || (event.bannerId ? "home_banner" : undefined),
        });
      }
    }

    return events;
  }, [batches]);

  const sponsorNames = useMemo(
    () =>
      Array.from(
        new Set(
          allEvents
            .map((event) => String(event.sponsorName || "Unassigned").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [allEvents]
  );

  const federations = useMemo(
    () =>
      Array.from(
        new Set(
          allEvents
            .map((event) => String(event.federation || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [allEvents]
  );

  const sports = useMemo(
    () =>
      Array.from(
        new Set(
          allEvents
            .map((event) => String(event.sport || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [allEvents]
  );

  const filteredEvents = useMemo(() => {
    const search = matchSearch.trim().toLowerCase();

    return allEvents.filter((event) => {
      const sponsor = String(event.sponsorName || "Unassigned").trim();
      const federation = String(event.federation || "").trim();
      const sport = String(event.sport || "").trim();
      const placement = event.placement || (event.bannerId ? "home_banner" : undefined);
      const title = String(event.matchTitle || "").toLowerCase();

      if (selectedSponsor !== "all" && sponsor !== selectedSponsor) return false;
      if (selectedFederation !== "all" && federation !== selectedFederation) return false;
      if (selectedSport !== "all" && sport !== selectedSport) return false;
      if (selectedPlacement !== "all" && placement !== selectedPlacement) return false;
      if (search && !title.includes(search)) return false;

      return true;
    });
  }, [
    allEvents,
    matchSearch,
    selectedFederation,
    selectedPlacement,
    selectedSponsor,
    selectedSport,
  ]);

  const metrics = useMemo(() => {
    const sessionIds = new Set<string>();
    const campaignMap = new Map<string, CampaignMetric>();
    const federationMap = new Map<string, GroupMetric>();
    const sportMap = new Map<string, GroupMetric>();
    const matchMap = new Map<string, MatchMetric>();
    const dayMap = new Map<string, GroupMetric>();

    let bannerImpressions = 0;
    let contentViews = 0;
    let clicks = 0;
    let viewSeconds = 0;

    for (const event of filteredEvents) {
      const sponsorName = String(event.sponsorName || "Unassigned").trim();
      const campaignName = String(event.campaignName || "Unassigned campaign").trim();
      const campaignId = String(event.campaignId || "").trim();
      const federation = String(event.federation || "Unassigned federation").trim();
      const sport = String(event.sport || "Unassigned sport").trim();
      const division = String(event.division || "").trim();
      const matchTitle = String(event.matchTitle || "Untitled match").trim();
      const contentId = String(event.contentId || "").trim();
      const placement = event.placement || (event.bannerId ? "home_banner" : undefined);
      const sessionId = String(event.sessionId || "").trim();
      const day = String(event.occurredAt || "").slice(0, 10);
      const seconds = Math.max(0, Number(event.viewSeconds || 0));

      if (event.kind === "impression" && placement === "home_banner") bannerImpressions += 1;
      if (event.kind === "qualified_view" && (placement === "live" || placement === "vod")) contentViews += 1;
      if (event.kind === "click") clicks += 1;
      if (event.kind === "view_session") viewSeconds += seconds;
      if (sessionId) sessionIds.add(sessionId);

      const campaignKey = campaignId || `${sponsorName}::${campaignName}`;
      const campaign =
        campaignMap.get(campaignKey) ||
        ({
          ...emptyGroup(campaignKey, campaignName),
          sponsorName,
          campaignName,
          campaignId,
        } as CampaignMetric);

      if (event.kind === "impression") campaign.impressions += 1;
      if (event.kind === "qualified_view") campaign.views += 1;
      if (event.kind === "click") campaign.clicks += 1;
      if (event.kind === "view_session") campaign.viewSeconds += seconds;
      if (sessionId) campaign.sessionIds.add(sessionId);
      campaignMap.set(campaignKey, campaign);

      if (placement === "live" || placement === "vod") {
        const federationMetric = federationMap.get(federation) || emptyGroup(federation, federation);
        const sportMetric = sportMap.get(sport) || emptyGroup(sport, sport);

        for (const group of [federationMetric, sportMetric]) {
          if (event.kind === "qualified_view") group.views += 1;
          if (event.kind === "click") group.clicks += 1;
          if (event.kind === "view_session") group.viewSeconds += seconds;
          if (sessionId) group.sessionIds.add(sessionId);
        }

        federationMap.set(federation, federationMetric);
        sportMap.set(sport, sportMetric);

        if (contentId) {
          const matchKey = `${placement}:${contentId}`;
          const match =
            matchMap.get(matchKey) ||
            ({
              ...emptyGroup(matchKey, matchTitle),
              placement,
              contentId,
              federation,
              division,
              sport,
              matchTitle,
            } as MatchMetric);

          if (event.kind === "qualified_view") match.views += 1;
          if (event.kind === "click") match.clicks += 1;
          if (event.kind === "view_session") match.viewSeconds += seconds;
          if (sessionId) match.sessionIds.add(sessionId);
          matchMap.set(matchKey, match);
        }
      }

      if (day) {
        const dayMetric = dayMap.get(day) || emptyGroup(day, day);
        if (event.kind === "impression") dayMetric.impressions += 1;
        if (event.kind === "qualified_view") dayMetric.views += 1;
        if (event.kind === "click") dayMetric.clicks += 1;
        if (event.kind === "view_session") dayMetric.viewSeconds += seconds;
        if (sessionId) dayMetric.sessionIds.add(sessionId);
        dayMap.set(day, dayMetric);
      }
    }

    return {
      bannerImpressions,
      contentViews,
      clicks,
      viewSeconds,
      uniqueSessions: sessionIds.size,
      campaigns: Array.from(campaignMap.values()).sort(
        (a, b) => b.impressions + b.views - (a.impressions + a.views)
      ),
      federations: Array.from(federationMap.values()).sort((a, b) => b.views - a.views),
      sports: Array.from(sportMap.values()).sort((a, b) => b.views - a.views),
      matches: Array.from(matchMap.values()).sort((a, b) => b.views - a.views),
      days: Array.from(dayMap.values()).sort((a, b) => b.key.localeCompare(a.key)),
    };
  }, [filteredEvents]);

  const exposureTotal = metrics.bannerImpressions + metrics.contentViews;
  const avgViewSeconds = metrics.contentViews > 0 ? metrics.viewSeconds / metrics.contentViews : 0;

  const exportMatches = useCallback(() => {
    const rows = [
      [
        "Placement",
        "Federation",
        "Division",
        "Sport",
        "Match",
        "Qualified views",
        "Unique sessions",
        "Viewing time",
        "Average viewing time",
        "Clicks",
      ],
      ...metrics.matches.map((match) => [
        match.placement,
        match.federation,
        match.division,
        match.sport,
        match.matchTitle,
        String(match.views),
        String(match.sessionIds.size),
        formatDuration(match.viewSeconds),
        formatDuration(match.views > 0 ? match.viewSeconds / match.views : 0),
        String(match.clicks),
      ]),
    ];

    downloadCsv(rows, `sportsai-sponsor-content-${dayString(new Date())}.csv`);
  }, [metrics.matches]);

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#030515] px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">
                SportsAI CMS
              </p>
              <h1 className="mt-2 text-4xl font-bold">Sponsor Insights</h1>
              <p className="mt-2 max-w-3xl text-slate-400">
                Home banner exposure plus Live and VOD performance by federation,
                sport and match title. Viewing time is active player-screen time.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportMatches}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                Export content CSV
              </button>
              <button
                type="button"
                onClick={() => void loadAnalytics()}
                disabled={loading}
                className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <select
              value={rangeDays}
              onChange={(event) => setRangeDays(Number(event.target.value) as RangeDays)}
              className="rounded-xl border border-white/10 bg-[#0b0d28] px-4 py-3 text-sm text-white"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>

            <select
              value={selectedSponsor}
              onChange={(event) => setSelectedSponsor(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#0b0d28] px-4 py-3 text-sm text-white"
            >
              <option value="all">All sponsors</option>
              {sponsorNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select
              value={selectedFederation}
              onChange={(event) => setSelectedFederation(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#0b0d28] px-4 py-3 text-sm text-white"
            >
              <option value="all">All federations</option>
              {federations.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select
              value={selectedSport}
              onChange={(event) => setSelectedSport(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#0b0d28] px-4 py-3 text-sm text-white"
            >
              <option value="all">All sports</option>
              {sports.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select
              value={selectedPlacement}
              onChange={(event) => setSelectedPlacement(event.target.value as "all" | SponsorPlacement)}
              className="rounded-xl border border-white/10 bg-[#0b0d28] px-4 py-3 text-sm text-white"
            >
              <option value="all">Home + Live + VOD</option>
              <option value="home_banner">Home banners</option>
              <option value="live">Live</option>
              <option value="vod">VOD</option>
            </select>

            <input
              value={matchSearch}
              onChange={(event) => setMatchSearch(event.target.value)}
              placeholder="Search match title..."
              className="rounded-xl border border-white/10 bg-[#0b0d28] px-4 py-3 text-sm text-white placeholder:text-slate-600"
            />
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard label="Home impressions" value={metrics.bannerImpressions.toLocaleString()} />
            <StatCard label="Live / VOD views" value={metrics.contentViews.toLocaleString()} helper="10-second qualified views" />
            <StatCard label="Unique sessions" value={metrics.uniqueSessions.toLocaleString()} />
            <StatCard label="Clicks" value={metrics.clicks.toLocaleString()} />
            <StatCard label="CTR" value={percent(metrics.clicks, exposureTotal)} />
            <StatCard label="Viewing time" value={formatDuration(metrics.viewSeconds)} helper={`Avg ${formatDuration(avgViewSeconds)}`} />
          </div>

          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-bold">Match performance</h2>
            <p className="mt-1 text-sm text-slate-500">
              Detailed Live/VOD sponsor performance by federation, sport and match.
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Federation</th>
                    <th className="px-3 py-3">Sport</th>
                    <th className="px-3 py-3">Match</th>
                    <th className="px-3 py-3">Views</th>
                    <th className="px-3 py-3">Unique</th>
                    <th className="px-3 py-3">Viewing time</th>
                    <th className="px-3 py-3">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {metrics.matches.map((match) => (
                    <tr key={match.key} className="text-slate-200">
                      <td className="px-3 py-4 font-bold uppercase">{match.placement}</td>
                      <td className="px-3 py-4">
                        <div className="font-semibold">{match.federation}</div>
                        {match.division ? <div className="text-xs text-slate-500">{match.division}</div> : null}
                      </td>
                      <td className="px-3 py-4">{match.sport}</td>
                      <td className="px-3 py-4 font-semibold">{match.matchTitle}</td>
                      <td className="px-3 py-4">{match.views.toLocaleString()}</td>
                      <td className="px-3 py-4">{match.sessionIds.size.toLocaleString()}</td>
                      <td className="px-3 py-4">{formatDuration(match.viewSeconds)}</td>
                      <td className="px-3 py-4">{formatDuration(match.views > 0 ? match.viewSeconds / match.views : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && metrics.matches.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-slate-500">
                  No Live/VOD sponsor analytics match the current filters yet.
                </p>
              ) : null}
            </div>
          </section>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-xl font-bold">Federation performance</h2>
              <div className="mt-5 space-y-3">
                {metrics.federations.map((item) => (
                  <div key={item.key} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-bold">{item.label}</p>
                      <p className="text-sm text-cyan-300">{item.views.toLocaleString()} views</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.sessionIds.size.toLocaleString()} unique sessions · {formatDuration(item.viewSeconds)} viewing time
                    </p>
                  </div>
                ))}
                {!loading && metrics.federations.length === 0 ? <p className="text-sm text-slate-500">No federation data yet.</p> : null}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <h2 className="text-xl font-bold">Sport performance</h2>
              <div className="mt-5 space-y-3">
                {metrics.sports.map((item) => (
                  <div key={item.key} className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-bold">{item.label}</p>
                      <p className="text-sm text-cyan-300">{item.views.toLocaleString()} views</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.sessionIds.size.toLocaleString()} unique sessions · {formatDuration(item.viewSeconds)} viewing time
                    </p>
                  </div>
                ))}
                {!loading && metrics.sports.length === 0 ? <p className="text-sm text-slate-500">No sport data yet.</p> : null}
              </div>
            </section>
          </div>

          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-bold">Campaign performance</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Sponsor</th>
                    <th className="px-3 py-3">Campaign</th>
                    <th className="px-3 py-3">Home impressions</th>
                    <th className="px-3 py-3">Live/VOD views</th>
                    <th className="px-3 py-3">Unique</th>
                    <th className="px-3 py-3">Clicks</th>
                    <th className="px-3 py-3">Viewing time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {metrics.campaigns.map((campaign) => (
                    <tr key={campaign.key}>
                      <td className="px-3 py-4 font-semibold">{campaign.sponsorName}</td>
                      <td className="px-3 py-4">{campaign.campaignName}</td>
                      <td className="px-3 py-4">{campaign.impressions.toLocaleString()}</td>
                      <td className="px-3 py-4">{campaign.views.toLocaleString()}</td>
                      <td className="px-3 py-4">{campaign.sessionIds.size.toLocaleString()}</td>
                      <td className="px-3 py-4">{campaign.clicks.toLocaleString()}</td>
                      <td className="px-3 py-4">{formatDuration(campaign.viewSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-xl font-bold">Daily performance</h2>
            <div className="mt-5 space-y-3">
              {metrics.days.map((day) => (
                <div key={day.key} className="flex flex-col gap-1 rounded-2xl border border-white/10 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <p className="font-bold">{day.label}</p>
                  <p className="text-sm text-slate-400">
                    {day.impressions.toLocaleString()} home impressions · {day.views.toLocaleString()} Live/VOD views · {day.sessionIds.size.toLocaleString()} unique · {day.clicks.toLocaleString()} clicks · {formatDuration(day.viewSeconds)} viewing time
                  </p>
                </div>
              ))}
              {!loading && metrics.days.length === 0 ? <p className="text-sm text-slate-500">No sponsor analytics have been received for this period yet.</p> : null}
            </div>
          </section>

          <p className="mt-8 text-xs leading-5 text-slate-600">
            Unique reach is anonymous app-session count. Viewing time measures time while the sponsored Live/VOD player screen is active; it does not identify users and does not send names, email addresses or phone numbers.
          </p>
        </div>
      </main>
    </CmsAuthGuard>
  );
}
