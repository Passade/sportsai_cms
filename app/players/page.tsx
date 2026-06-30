"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import { CmsPlayer, getCmsPlayersPage } from "@/lib/cms";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 25;

type PlayerPageSnapshot = {
  players: CmsPlayer[];
  total: number;
  nextCursor: string | null;
  pageNumber: number;
};

function getPlayerInitials(name?: string) {
  const cleaned = String(name || "").trim();

  if (!cleaned) {
    return "P";
  }

  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 1).toUpperCase();
  }

  return `${words[0].slice(0, 1)}${words[1].slice(0, 1)}`.toUpperCase();
}

function getSafeImageUrl(value?: string) {
  const url = String(value || "").trim();

  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<CmsPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageHistory, setPageHistory] = useState<PlayerPageSnapshot[]>([]);

  async function loadPlayers(options?: { cursor?: string; reset?: boolean }) {
    try {
      setLoading(true);

      const data = await getCmsPlayersPage(options?.cursor);

      setPlayers(data.documents);
      setTotal(data.total);
      setNextCursor(data.nextCursor);

      if (options?.reset) {
        setPageNumber(1);
        setPageHistory([]);
      }
    } catch (error: any) {
      console.error("Players load error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not load players. Check your Appwrite setup."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlayers({ reset: true });
  }, []);

  const visiblePlayers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return players;
    }

    // Local search only. This searches the currently loaded 25 players and does not
    // trigger extra Appwrite reads or require a fulltext searchText index.
    return players.filter((player) => {
      return [
        player.name,
        player.school,
        player.teamName,
        player.sport,
        player.position,
        player.country,
        player.number,
        player.age,
        player.active ? "active" : "inactive",
        player.$id,
      ]
        .filter((value) => value !== undefined && value !== null && value !== "")
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [players, search]);

  async function refreshPlayers() {
    setSearch("");
    await loadPlayers({ reset: true });
  }

  async function goToNextPage() {
    if (!nextCursor || loading || players.length === 0) {
      return;
    }

    setPageHistory((current) => [
      ...current,
      {
        players,
        total,
        nextCursor,
        pageNumber,
      },
    ]);

    await loadPlayers({ cursor: nextCursor });
    setSearch("");
    setPageNumber((current) => current + 1);
  }

  function goToPreviousPage() {
    if (loading || pageHistory.length === 0) {
      return;
    }

    const history = [...pageHistory];
    const previousPage = history.pop();

    if (!previousPage) {
      return;
    }

    setPlayers(previousPage.players);
    setTotal(previousPage.total);
    setNextCursor(previousPage.nextCursor);
    setPageNumber(previousPage.pageNumber);
    setPageHistory(history);
    setSearch("");
  }

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] text-[#29496d]">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-8 py-6">
            <div>
              <Link
                href="/"
                prefetch={false}
                className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-4xl font-bold">Players</h1>

              <p className="mt-2 text-slate-500">
                Manage player profiles used in SportsAI.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={refreshPlayers}
                disabled={loading}
                className="rounded border border-slate-200 bg-white px-5 py-4 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>

              <Link
                href="/players/create"
                prefetch={false}
                className="rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white transition hover:bg-cyan-600"
              >
                + Create Player
              </Link>

              <CmsLogoutButton />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <label className="block flex-1">
                <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Search loaded players
                </span>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search this page only: name, team, school, sport, position or country..."
                  className="mt-3 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                />
              </label>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-sm font-bold text-[#29496d]">
                  Page {pageNumber}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Showing up to {PAGE_SIZE} players from {total} total.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              Loading players...
            </div>
          ) : visiblePlayers.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              No players found on this page.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visiblePlayers.map((player) => {
                const imageUrl = getSafeImageUrl(player.imageUrl);

                return (
                  <Link
                    key={player.$id}
                    href={`/players/${player.$id}`}
                    prefetch={false}
                    className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cyan-100 text-xl font-bold text-cyan-700">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageUrl}
                            alt={player.name || "Player"}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getPlayerInitials(player.name)
                        )}
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-2xl font-bold text-[#29496d]">
                          {player.name || "Untitled player"}
                        </h2>

                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {player.teamName || player.school || "No team"}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {[player.position, player.sport]
                            .filter(Boolean)
                            .join(" · ") || "No position"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        #{player.number || 0}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                        Age {player.age || 0}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 ${
                          player.active
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {player.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-base font-bold text-[#29496d]">
                Players pagination
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Next loads one more Appwrite page. Previous uses the page already
                loaded in this browser session.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={loading || pageHistory.length === 0}
                onClick={goToPreviousPage}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Previous
              </button>

              <button
                type="button"
                disabled={loading || !nextCursor || players.length < PAGE_SIZE}
                onClick={goToNextPage}
                className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>
        </section>
      </main>
    </CmsAuthGuard>
  );
}
