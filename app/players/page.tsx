"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import { CmsPlayer, getCmsPlayers } from "@/lib/cms";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function PlayersPage() {
  const [players, setPlayers] = useState<CmsPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadPlayers() {
    try {
      setLoading(true);
      const data = await getCmsPlayers();
      setPlayers(data);
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
    loadPlayers();
  }, []);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return players;
    }

    return players.filter((player) => {
      return [
        player.name,
        player.school,
        player.teamName,
        player.sport,
        player.position,
        player.country,
        player.searchText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [players, search]);

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

              <h1 className="mt-2 text-4xl font-bold">Players</h1>

              <p className="mt-2 text-slate-500">
                Manage player profiles used in SportsAI.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/players/create"
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
            <label className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Search players
            </label>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, team, school, sport, position or country..."
              className="mt-3 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
            />
          </div>

          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              Loading players...
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              No players found.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredPlayers.map((player) => (
                <Link
                  key={player.$id}
                  href={`/players/${player.$id}`}
                  className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cyan-100 text-xl font-bold text-cyan-700">
                      {player.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={player.imageUrl}
                          alt={player.name || "Player"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        player.name?.slice(0, 1).toUpperCase() || "P"
                      )}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-bold text-[#29496d]">
                        {player.name || "Untitled player"}
                      </h2>

                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {player.teamName || "No team"}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {[player.position, player.sport].filter(Boolean).join(" · ") ||
                          "No position"}
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
              ))}
            </div>
          )}
        </section>
      </main>
    </CmsAuthGuard>
  );
}
