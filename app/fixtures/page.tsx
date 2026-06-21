"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import { CmsFixture, getCmsFixtures } from "@/lib/cms";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function formatDate(value?: string) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<CmsFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadFixtures() {
    try {
      setLoading(true);
      const data = await getCmsFixtures();
      setFixtures(data);
    } catch (error: any) {
      console.error("Fixtures load error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not load fixtures. Check your Appwrite setup."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFixtures();
  }, []);

  const filteredFixtures = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return fixtures;
    }

    return fixtures.filter((fixture) => {
      return [
        fixture.homeTeam,
        fixture.awayTeam,
        fixture.sport,
        fixture.communityName,
        fixture.competition,
        fixture.venue,
        fixture.status,
        fixture.searchText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [fixtures, search]);

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] text-[#29496d]">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-8 py-6">
            <div>
              <Link
                href="/"
                className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-4xl font-bold">Fixtures</h1>

              <p className="mt-2 text-slate-500">
                Manage prediction fixtures, scores, status and prediction scoring.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/fixtures/create"
                className="rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white transition hover:bg-cyan-600"
              >
                + Create Fixture
              </Link>

              <CmsLogoutButton />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <label className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Search fixtures
            </label>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by team, sport, community, competition, venue or status..."
              className="mt-3 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
            />
          </div>

          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              Loading fixtures...
            </div>
          ) : filteredFixtures.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              No fixtures found.
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredFixtures.map((fixture) => (
                <Link
                  key={fixture.$id}
                  href={`/fixtures/${fixture.$id}`}
                  className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-700">
                          {fixture.status || "upcoming"}
                        </span>

                        {fixture.isStreamed ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-700">
                            Streamed
                          </span>
                        ) : null}
                      </div>

                      <h2 className="mt-4 text-2xl font-bold text-[#29496d]">
                        {fixture.homeTeam || "Home"} vs {fixture.awayTeam || "Away"}
                      </h2>

                      <p className="mt-2 text-slate-500">
                        {[fixture.competition, fixture.communityName, fixture.sport]
                          .filter(Boolean)
                          .join(" · ") || "No competition"}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {formatDate(fixture.matchDate)} · {fixture.venue || "No venue"}
                      </p>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="text-4xl font-black text-[#29496d]">
                        {fixture.homeScore ?? 0} - {fixture.awayScore ?? 0}
                      </p>

                      <p className="mt-2 text-sm font-semibold text-slate-400">
                        Click to edit and score predictions
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </CmsAuthGuard>
  );
}
