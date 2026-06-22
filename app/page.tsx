"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  CmsDashboardAnalytics,
  getCmsDashboardAnalytics,
} from "@/lib/cms";
import Link from "next/link";
import { useEffect, useState } from "react";

function DashboardCard({
  title,
  description,
  href,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          {badge ? (
            <span className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-700">
              {badge}
            </span>
          ) : null}

          <h2 className="mt-4 text-2xl font-bold text-[#29496d]">{title}</h2>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-500 text-xl font-bold text-white transition group-hover:bg-cyan-600">
          →
        </div>
      </div>

      <p className="mt-4 text-base leading-7 text-slate-500">{description}</p>
    </Link>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-4xl font-bold text-[#29496d]">{value}</p>

      {helper ? <p className="mt-2 text-sm text-slate-400">{helper}</p> : null}
    </div>
  );
}

function defaultAnalytics(): CmsDashboardAnalytics {
  return {
    eventsTotal: 0,
    eventsLive: 0,
    fixturesTotal: 0,
    fixturesUpcoming: 0,
    fixturesLive: 0,
    fixturesCompleted: 0,
    teamsTotal: 0,
    playersTotal: 0,
    communityPostsTotal: 0,
    communityPostsActive: 0,
    pollsActive: 0,
    predictionsTotal: 0,
    mediaTotal: 0,
  };
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<CmsDashboardAnalytics>(
    defaultAnalytics()
  );
  const [loading, setLoading] = useState(true);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const data = await getCmsDashboardAnalytics();
      setAnalytics(data);
    } catch (error: any) {
      console.error("Dashboard analytics load error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not load dashboard analytics."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] text-[#29496d]">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-8 py-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-[3px] text-cyan-600">
                SportsAI CMS
              </p>

              <h1 className="mt-2 text-4xl font-bold">Admin Dashboard</h1>

              <p className="mt-2 text-slate-500">
                {loading
                  ? "Loading analytics..."
                  : "Live overview of your SportsAI content."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadAnalytics}
                className="rounded border border-slate-200 bg-white px-5 py-4 font-bold text-[#29496d] transition hover:bg-slate-50"
              >
                Refresh
              </button>

              <Link
                href="/events/create"
                className="rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white transition hover:bg-cyan-600"
              >
                + Create Event
              </Link>

              <CmsLogoutButton />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Events"
              value={analytics.eventsTotal}
              helper={`${analytics.eventsLive} live`}
            />

            <StatCard
              label="Fixtures"
              value={analytics.fixturesTotal}
              helper={`${analytics.fixturesUpcoming} upcoming`}
            />

            <StatCard
              label="Completed"
              value={analytics.fixturesCompleted}
              helper={`${analytics.fixturesLive} live fixtures`}
            />

            <StatCard label="Teams" value={analytics.teamsTotal} />

            <StatCard label="Players" value={analytics.playersTotal} />

            <StatCard label="Media" value={analytics.mediaTotal} />
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <StatCard
              label="Community Posts"
              value={analytics.communityPostsTotal}
              helper={`${analytics.communityPostsActive} active`}
            />

            <StatCard
              label="Active Polls"
              value={analytics.pollsActive}
              helper="Community engagement"
            />

            <StatCard
              label="Predictions"
              value={analytics.predictionsTotal}
              helper="Total submitted"
            />
          </div>

          <div className="mt-10 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[3px] text-cyan-600">
                Quick Start
              </p>

              <h2 className="mt-3 text-3xl font-bold">
                Manage your SportsAI content
              </h2>

              <p className="mt-3 text-lg leading-8 text-slate-500">
                Create events, update prediction fixtures, manage teams and
                players, publish community posts, and upload media.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <DashboardCard
              title="Events / Live Streams"
              description="Create upcoming matches, live broadcasts and VOD entries."
              href="/events"
              badge="Content"
            />

            <DashboardCard
              title="Fixtures / Predictions"
              description="Manage fixtures, update scores, statuses and prediction records."
              href="/fixtures"
              badge="Matches"
            />

            <DashboardCard
              title="Community Posts"
              description="Create and manage polls, debates, image posts and voting options."
              href="/community"
              badge="Feed"
            />

            <DashboardCard
              title="Media Library"
              description="Upload and manage event thumbnails, team logos, player photos and community images."
              href="/media"
              badge="Storage"
            />

            <DashboardCard
              title="Teams"
              description="Create and manage team names, short names and logos."
              href="/teams"
              badge="Data"
            />

            <DashboardCard
              title="Players"
              description="Create and manage player profiles, schools, positions and photos."
              href="/players"
              badge="Data"
            />
          </div>
        </section>
      </main>
    </CmsAuthGuard>
  );
}
