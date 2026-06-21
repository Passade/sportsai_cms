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
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-[#29496d]">{value}</p>
    </div>
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

              <h1 className="mt-2 text-4xl font-bold">Admin Dashboard</h1>
            </div>

            <div className="flex items-center gap-3">
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
          <div className="grid gap-5 md:grid-cols-4">
            <StatCard label="Content Hub" value="Events" />
            <StatCard label="Publishing" value="Live + VOD" />
            <StatCard label="Teams" value="Managed" />
            <StatCard label="Players" value="Managed" />
          </div>

          <div className="mt-10 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[3px] text-cyan-600">
                Quick Start
              </p>

              <h2 className="mt-3 text-3xl font-bold">
                Create and manage your SportsAI content
              </h2>

              <p className="mt-3 text-lg leading-8 text-slate-500">
                Start with Events / Live Streams. Teams are managed from the
                Teams section and automatically appear in event dropdowns.
                Players are managed from the Players section and can be linked
                to teams by team name.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <DashboardCard
              title="Events / Live Streams"
              description="Create fixtures, upcoming matches, live broadcasts and VOD entries."
              href="/events"
              badge="Available"
            />

            <DashboardCard
              title="Create Event"
              description="Quickly add a new match, stream URL, VOD URL, teams, venue and match date."
              href="/events/create"
              badge="Quick action"
            />

            <DashboardCard
              title="Teams"
              description="Create and manage team names, short names and logos used in event dropdowns."
              href="/teams"
              badge="Available"
            />

            <DashboardCard
              title="Players"
              description="Create and manage player profiles, team names, schools, positions and photos."
              href="/players"
              badge="Available"
            />

            <DashboardCard
              title="Fixtures"
              description="Coming next: manage prediction fixtures, match results and fixture status."
              href="/events"
              badge="Coming next"
            />

            <DashboardCard
              title="Predictions"
              description="Coming next: manage prediction fixtures, community voting and results."
              href="/events"
              badge="Coming next"
            />
          </div>
        </section>
      </main>
    </CmsAuthGuard>
  );
}
