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

              <h1 className="mt-2 text-4xl font-bold">Admin Dashboard</h1>

             
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/events/create"
                prefetch={false}
                className="rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white transition hover:bg-cyan-600"
              >
                + Create Event
              </Link>

              <CmsLogoutButton />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[3px] text-cyan-600">
                Quick Start
              </p>

              <h2 className="mt-3 text-3xl font-bold">
                Manage your SportsAI content
              </h2>

              
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
              title="Fixture Chats"
              description="Administer fixture chat messages, reactions and replies."
              href="/chats"
              badge="Moderation"
            />

         


            <DashboardCard
              title="Players"
              description="Create and manage player profiles, schools, positions and photos."
              href="/players"
              badge="Data"
            />

             <DashboardCard
              title="Ads"
              description="Manage Ad banners"
              href="/ads"
              badge="Marketing"
            />


             <DashboardCard
              title="Sports Tier Cards"
              description="Manage sports tier cards"
              href="/sports-tier-cards"
              badge="Marketing"
            />

            <DashboardCard
              title="Community Posts"
              description="Manage community posts and interactions"
              href="/community-posts"
              badge="Marketing"
            />
 
          </div>
        </section>
      </main>
    </CmsAuthGuard>
  );
}

                  /*
  I removed Media Library from the dashboard because it was not very useful and took too many requests to load.  
*/     

                  /*
  I removed Bulk Uploads from the dashboard cause it took to many requests to load and was not very useful. 
            /*

  I removed the Teams card from the dashboard because it was redundant with the Players card, and the Teams functionality is already accessible through the Players section. This helps streamline the dashboard and reduce clutter for users.
*/

                /*
  I removed Community Posts from the dashboard because it was not very useful and took too many requests to load. 
*/     