"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import { Client, Databases, Models, Query } from "appwrite";
import { useCallback, useEffect, useMemo, useState } from "react";

type RangeDays = 7 | 30 | 90;

type AnalyticsBatchDocument = Models.Document & {
  day?: string;
  eventCount?: number;
  source?: string;
  payload?: string;
};

type SponsorEvent = {
  id?: string;
  kind?: "impression" | "click";
  bannerId?: string;
  sponsorName?: string;
  campaignId?: string;
  campaignName?: string;
  sessionId?: string;
  occurredAt?: string;
};

type CampaignMetric = {
  key: string;
  sponsorName: string;
  campaignName: string;
  campaignId: string;
  bannerIds: Set<string>;
  sessionIds: Set<string>;
  impressions: number;
  clicks: number;
};

type DayMetric = {
  day: string;
  impressions: number;
  clicks: number;
  sessionIds: Set<string>;
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

function percent(clicks: number, impressions: number) {
  if (impressions <= 0) return "0.00%";
  return `${((clicks / impressions) * 100).toFixed(2)}%`;
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

export default function SponsorInsightsPage() {
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [batches, setBatches] = useState<AnalyticsBatchDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSponsor, setSelectedSponsor] = useState("all");

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

        if (eventId && seenEventIds.has(eventId)) {
          continue;
        }

        if (eventId) seenEventIds.add(eventId);
        events.push(event);
      }
    }

    return events;
  }, [batches]);

  const sponsorNames = useMemo(() => {
    return Array.from(
      new Set(
        allEvents
          .map((event) => String(event.sponsorName || "Unassigned").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [allEvents]);

  const filteredEvents = useMemo(() => {
    if (selectedSponsor === "all") return allEvents;

    return allEvents.filter(
      (event) =>
        String(event.sponsorName || "Unassigned").trim() === selectedSponsor
    );
  }, [allEvents, selectedSponsor]);

  const metrics = useMemo(() => {
    const campaignMap = new Map<string, CampaignMetric>();
    const dayMap = new Map<string, DayMetric>();
    const sessionIds = new Set<string>();

    let impressions = 0;
    let clicks = 0;

    for (const event of filteredEvents) {
      const sponsorName = String(event.sponsorName || "Unassigned").trim();
      const campaignName = String(event.campaignName || "Unassigned campaign").trim();
      const campaignId = String(event.campaignId || "").trim();
      const bannerId = String(event.bannerId || "unknown-banner").trim();
      const sessionId = String(event.sessionId || "").trim();
      const day = String(event.occurredAt || "").slice(0, 10);
      const key = campaignId || `${sponsorName}::${campaignName}`;

      if (event.kind === "impression") impressions += 1;
      if (event.kind === "click") clicks += 1;
      if (sessionId) sessionIds.add(sessionId);

      const existingCampaign = campaignMap.get(key) || {
        key,
        sponsorName,
        campaignName,
        campaignId,
        bannerIds: new Set<string>(),
        sessionIds: new Set<string>(),
        impressions: 0,
        clicks: 0,
      };

      existingCampaign.bannerIds.add(bannerId);
      if (sessionId) existingCampaign.sessionIds.add(sessionId);
      if (event.kind === "impression") existingCampaign.impressions += 1;
      if (event.kind === "click") existingCampaign.clicks += 1;
      campaignMap.set(key, existingCampaign);

      if (day) {
        const existingDay = dayMap.get(day) || {
          day,
          impressions: 0,
          clicks: 0,
          sessionIds: new Set<string>(),
        };

        if (event.kind === "impression") existingDay.impressions += 1;
        if (event.kind === "click") existingDay.clicks += 1;
        if (sessionId) existingDay.sessionIds.add(sessionId);
        dayMap.set(day, existingDay);
      }
    }

    return {
      impressions,
      clicks,
      uniqueSessions: sessionIds.size,
      campaigns: Array.from(campaignMap.values()).sort(
        (a, b) => b.impressions - a.impressions
      ),
      days: Array.from(dayMap.values()).sort((a, b) =>
        b.day.localeCompare(a.day)
      ),
    };
  }, [filteredEvents]);

  const exportReport = useCallback(() => {
    const rows: string[][] = [
      [
        "Sponsor",
        "Campaign",
        "Campaign ID",
        "Banners",
        "Impressions",
        "Unique Sessions",
        "Clicks",
        "CTR",
      ],
    ];

    for (const campaign of metrics.campaigns) {
      rows.push([
        campaign.sponsorName,
        campaign.campaignName,
        campaign.campaignId,
        String(campaign.bannerIds.size),
        String(campaign.impressions),
        String(campaign.sessionIds.size),
        String(campaign.clicks),
        percent(campaign.clicks, campaign.impressions),
      ]);
    }

    downloadCsv(rows, `sponsor-insights-${rangeDays}-days.csv`);
  }, [metrics.campaigns, rangeDays]);

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="border-b border-white/10 bg-slate-900/70">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">
                SportsAI CMS
              </p>
              <h1 className="mt-2 text-3xl font-bold">Sponsor Insights</h1>
              <p className="mt-2 text-sm text-slate-400">
                Banner impressions, unique sessions, clicks and CTR.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <select
                value={rangeDays}
                onChange={(event) =>
                  setRangeDays(Number(event.target.value) as RangeDays)
                }
                className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>

              <select
                value={selectedSponsor}
                onChange={(event) => setSelectedSponsor(event.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
              >
                <option value="all">All sponsors</option>
                {sponsorNames.map((sponsor) => (
                  <option key={sponsor} value={sponsor}>
                    {sponsor}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={exportReport}
                disabled={metrics.campaigns.length === 0}
                className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50"
              >
                Export CSV
              </button>

              <button
                type="button"
                onClick={() => void loadAnalytics()}
                disabled={loading}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-bold"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-8">
          {error ? (
            <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-4 text-red-100">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Impressions" value={metrics.impressions.toLocaleString()} />
            <MetricCard label="Unique sessions" value={metrics.uniqueSessions.toLocaleString()} />
            <MetricCard label="Clicks" value={metrics.clicks.toLocaleString()} />
            <MetricCard label="CTR" value={percent(metrics.clicks, metrics.impressions)} />
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
            <div className="border-b border-white/10 px-6 py-5">
              <h2 className="text-xl font-bold">Campaigns performance</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Sponsor</th>
                    <th className="px-5 py-4">Campaign</th>
                    <th className="px-5 py-4">Banners</th>
                    <th className="px-5 py-4">Impressions</th>
                    <th className="px-5 py-4">Unique sessions</th>
                    <th className="px-5 py-4">Clicks</th>
                    <th className="px-5 py-4">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.campaigns.map((campaign) => (
                    <tr key={campaign.key} className="border-t border-white/5">
                      <td className="px-5 py-4 font-semibold">{campaign.sponsorName}</td>
                      <td className="px-5 py-4 text-slate-300">{campaign.campaignName}</td>
                      <td className="px-5 py-4">{campaign.bannerIds.size}</td>
                      <td className="px-5 py-4">{campaign.impressions.toLocaleString()}</td>
                      <td className="px-5 py-4">{campaign.sessionIds.size.toLocaleString()}</td>
                      <td className="px-5 py-4">{campaign.clicks.toLocaleString()}</td>
                      <td className="px-5 py-4">{percent(campaign.clicks, campaign.impressions)}</td>
                    </tr>
                  ))}

                  {!loading && metrics.campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                        No sponsor analytics have been received for this period yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
            <div className="border-b border-white/10 px-6 py-5">
              <h2 className="text-xl font-bold">Daily performance</h2>
            </div>

            <div className="divide-y divide-white/5">
              {metrics.days.slice(0, 31).map((day) => (
                <div
                  key={day.day}
                  className="grid gap-3 px-6 py-4 sm:grid-cols-4 sm:items-center"
                >
                  <div className="font-semibold">{day.day}</div>
                  <div className="text-slate-300">
                    {day.impressions.toLocaleString()} impressions
                  </div>
                  <div className="text-slate-300">
                    {day.sessionIds.size.toLocaleString()} sessions
                  </div>
                  <div className="text-slate-300">
                    {day.clicks.toLocaleString()} clicks · {percent(day.clicks, day.impressions)} CTR
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 text-xs leading-5 text-slate-500">
            Unique reach is shown as anonymous app sessions, not user identity. The app does not send names,
            email addresses or phone numbers with sponsor analytics.
          </p>
        </section>
      </main>
    </CmsAuthGuard>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900 px-5 py-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}
