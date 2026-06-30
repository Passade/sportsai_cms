"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import { CmsTeam, getCmsTeamsPage } from "@/lib/cms";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 50;

type TeamsPageCache = {
  pageNumber: number;
  teams: CmsTeam[];
  cursor: string | null;
  total: number;
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<CmsTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCache, setPageCache] = useState<TeamsPageCache[]>([]);

  async function loadTeams(options?: { cursor?: string; page?: number; reset?: boolean }) {
    try {
      setLoading(true);

      const data = await getCmsTeamsPage(options?.cursor);
      const nextPageNumber = options?.page || 1;

      setTeams(data.documents || []);
      setTotal(data.total || 0);
      setNextCursor(data.nextCursor || null);
      setPageNumber(nextPageNumber);

      if (options?.reset) {
        setPageCache([
          {
            pageNumber: 1,
            teams: data.documents || [],
            cursor: data.nextCursor || null,
            total: data.total || 0,
          },
        ]);
      } else {
        setPageCache((current) => {
          const withoutCurrent = current.filter(
            (item) => item.pageNumber !== nextPageNumber
          );

          return [
            ...withoutCurrent,
            {
              pageNumber: nextPageNumber,
              teams: data.documents || [],
              cursor: data.nextCursor || null,
              total: data.total || 0,
            },
          ].sort((a, b) => a.pageNumber - b.pageNumber);
        });
      }
    } catch (error: any) {
      console.error("Teams load error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not load teams. Check your Appwrite setup."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeams({ reset: true });
  }, []);

  const filteredTeams = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return teams;

    return teams.filter((team) =>
      [team?.name, team?.shortName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(cleanQuery)
    );
  }, [teams, query]);

  async function refreshTeams() {
    await loadTeams({ reset: true });
  }

  async function goToNextPage() {
    if (!nextCursor || loading || teams.length < PAGE_SIZE) return;

    await loadTeams({
      cursor: nextCursor,
      page: pageNumber + 1,
    });
  }

  function goToPreviousPage() {
    if (loading || pageNumber <= 1) return;

    const previousPageNumber = pageNumber - 1;
    const cachedPage = pageCache.find(
      (item) => item.pageNumber === previousPageNumber
    );

    if (!cachedPage) {
      refreshTeams();
      return;
    }

    setTeams(cachedPage.teams);
    setTotal(cachedPage.total);
    setNextCursor(cachedPage.cursor);
    setPageNumber(previousPageNumber);
  }

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] px-8 py-8 text-[#29496d]">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              prefetch={false}
              className="font-medium text-cyan-600"
            >
              Back to dashboard
            </Link>

            <CmsLogoutButton />
          </div>

          <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[3px] text-cyan-600">
                CMS
              </p>

              <h1 className="mt-2 text-5xl font-bold">Teams</h1>

              <p className="mt-3 max-w-2xl text-slate-500">
                Manage the team names that appear in event home and guest team
                dropdowns.
              </p>
            </div>

            <Link
              href="/teams/create"
              prefetch={false}
              className="inline-flex items-center justify-center rounded bg-cyan-500 px-8 py-4 text-lg font-bold text-white transition hover:bg-cyan-600"
            >
              + Create Team
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search loaded teams by team name or short name..."
              className="h-14 w-full border border-slate-300 bg-white px-5 text-lg text-[#29496d] outline-none placeholder:text-[#9fb0c2] focus:border-cyan-500"
            />

            <button
              type="button"
              onClick={refreshTeams}
              disabled={loading}
              className="h-14 border border-slate-300 bg-white px-8 text-lg font-bold text-[#29496d] transition hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Matching Teams
              </p>
              <p className="mt-2 text-3xl font-bold">{total}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Current Page
              </p>
              <p className="mt-2 text-3xl font-bold">{pageNumber}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Loaded Now
              </p>
              <p className="mt-2 text-3xl font-bold">{teams.length}</p>
            </div>
          </div>

          {loading ? (
            <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
              <p className="text-slate-500">Loading teams...</p>
            </div>
          ) : (
            <div className="mt-10 space-y-4">
              {filteredTeams.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-8">
                  <p className="text-2xl font-bold">No teams found</p>

                  <p className="mt-2 text-slate-500">
                    Create your first team so it appears in event dropdowns, or
                    clear the local search box.
                  </p>

                  <Link
                    href="/teams/create"
                    prefetch={false}
                    className="mt-6 inline-flex rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white transition hover:bg-cyan-600"
                  >
                    + Create Team
                  </Link>
                </div>
              ) : (
                filteredTeams.map((team) => (
                  <Link
                    key={team.$id}
                    href={`/teams/${team.$id}`}
                    prefetch={false}
                    className="block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-5">
                      <div className="flex min-w-0 items-center gap-4">
                        {team.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={team.logoUrl}
                            alt={team.name || "Team logo"}
                            loading="lazy"
                            className="h-14 w-14 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-100 text-xl font-bold text-cyan-700">
                            {String(team.name || "?").slice(0, 1)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-2xl font-bold">
                            {team.name || "Untitled team"}
                          </p>

                          <p className="mt-1 text-slate-500">
                            {team.shortName || "No short name"}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="rounded bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                          Edit
                        </span>

                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-500 text-xl font-bold text-white">
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-base font-bold text-[#29496d]">
                Page {pageNumber}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Showing up to {PAGE_SIZE} teams per Appwrite request. Search
                only filters the teams loaded on this page.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={loading || pageNumber === 1}
                onClick={goToPreviousPage}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Previous
              </button>

              <button
                type="button"
                disabled={loading || !nextCursor || teams.length < PAGE_SIZE}
                onClick={goToNextPage}
                className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </main>
    </CmsAuthGuard>
  );
}
