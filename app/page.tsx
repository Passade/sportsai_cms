"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import Link from "next/link";

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
      prefetch={false}
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

export default function DashboardPage() {
  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] text-[#29496d]">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-8 py-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-[3px] text-cyan-600">
                SportsAI CMS
              </p>

              <h1 className="mt-2 text-4xl font-bold">Content Management</h1>

              <p className="mt-2 text-slate-500">
                Choose the section you want to manage.
              </p>
            </div>

            <CmsLogoutButton />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
              title="Fixture Chats"
              description="Administer fixture chat messages, reactions and replies."
              href="/chats"
              badge="Moderation"
            />

            <DashboardCard
              title="Media Library"
              description="Upload and manage event thumbnails, team logos, player photos and community images."
              href="/media"
              badge="Storage"
            />

            <DashboardCard
              title="Bulk Import"
              description="Upload CSV files to quickly create teams, players and fixtures."
              href="/import"
              badge="Tools"
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


            <DashboardCard
              title="Youtube Playlists"
              description="Create and manage Youtube playlists for your content."
              href="/youtube-playlists/starter-plan"
              badge="Content"
            />

            <DashboardCard
              title="Sport Tier cards"
              description="Create and manage Sport Tier cards for your content."
              href="/sport-tier-cards"
              badge="Content"
            />
            <DashboardCard
              title="ads"
              description="ads."
              href="/ads"
              badge="Content"
            />
             <DashboardCard
              title="sponsers"
              description="sponser."
              href="/sponser-insight"
              badge="Content"
            />
          </div>
        </section>
      </main>
    </CmsAuthGuard>
  );
}