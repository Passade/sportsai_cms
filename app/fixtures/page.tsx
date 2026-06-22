"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  getCmsErrorMessage,
  useCmsToast,
} from "@/components/cms-toast-provider";
import { CmsFixture, deleteCmsFixture, getCmsFixtures } from "@/lib/cms";
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
  const { showSuccess, showError, showWarning } = useCmsToast();

  const [fixtures, setFixtures] = useState<CmsFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  async function loadFixtures() {
    try {
      setLoading(true);
      const data = await getCmsFixtures();
      setFixtures(data);
      setSelectedIds([]);
    } catch (error) {
      console.error("Fixtures load error:", error);
      showError(
        "Could not load fixtures",
        getCmsErrorMessage(error) || "Check your Appwrite setup."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFixtures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const filteredIds = filteredFixtures.map((fixture) => fixture.$id);
  const selectedInFiltered = selectedIds.filter((id) =>
    filteredIds.includes(id)
  );

  const allFilteredSelected =
    filteredFixtures.length > 0 &&
    filteredFixtures.every((fixture) => selectedIds.includes(fixture.$id));

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedIds((current) =>
        current.filter((selectedId) => !filteredIds.includes(selectedId))
      );
      return;
    }

    setSelectedIds((current) =>
      Array.from(new Set([...current, ...filteredIds]))
    );
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) {
      showWarning("No fixtures selected", "Select at least one fixture first.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected fixture${
        selectedIds.length === 1 ? "" : "s"
      }? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      await Promise.all(selectedIds.map((id) => deleteCmsFixture(id)));

      setFixtures((current) =>
        current.filter((fixture) => !selectedIds.includes(fixture.$id))
      );
      setSelectedIds([]);

      showSuccess(
        "Fixtures deleted",
        `Deleted ${selectedIds.length} selected fixture${
          selectedIds.length === 1 ? "" : "s"
        }.`
      );
    } catch (error) {
      console.error("Bulk delete fixtures error:", error);
      showError("Could not delete fixtures", getCmsErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

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

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-3 font-bold text-[#29496d]">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    className="h-5 w-5"
                  />

                  Select all visible
                </label>

                <span className="text-sm font-semibold text-slate-500">
                  {selectedIds.length} selected
                  {selectedInFiltered.length !== selectedIds.length
                    ? ` · ${selectedInFiltered.length} visible`
                    : ""}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  disabled={selectedIds.length === 0 || deleting}
                  className="rounded border border-slate-200 bg-white px-4 py-3 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear Selection
                </button>

                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.length === 0 || deleting}
                  className="rounded bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete Selected"}
                </button>
              </div>
            </div>
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
              {filteredFixtures.map((fixture) => {
                const isSelected = selectedIds.includes(fixture.$id);

                return (
                  <article
                    key={fixture.$id}
                    className={`rounded-[28px] border bg-white p-6 shadow-sm transition ${
                      isSelected
                        ? "border-red-300 ring-2 ring-red-100"
                        : "border-slate-200 hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 flex-1 gap-4">
                        <label className="mt-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelected(fixture.$id)}
                            className="h-5 w-5"
                            aria-label={`Select ${fixture.homeTeam || "Home"} vs ${
                              fixture.awayTeam || "Away"
                            }`}
                          />
                        </label>

                        <div className="min-w-0">
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
                            {fixture.homeTeam || "Home"} vs{" "}
                            {fixture.awayTeam || "Away"}
                          </h2>

                          <p className="mt-2 text-slate-500">
                            {[
                              fixture.competition,
                              fixture.communityName,
                              fixture.sport,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "No competition"}
                          </p>

                          <p className="mt-1 text-sm text-slate-400">
                            {formatDate(fixture.matchDate)} ·{" "}
                            {fixture.venue || "No venue"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            ID: {fixture.$id}
                          </p>
                        </div>
                      </div>

                      <div className="text-left lg:text-right">
                        <p className="text-4xl font-black text-[#29496d]">
                          {fixture.homeScore ?? 0} - {fixture.awayScore ?? 0}
                        </p>

                        <Link
                          href={`/fixtures/${fixture.$id}`}
                          className="mt-3 inline-flex rounded border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#29496d] transition hover:bg-slate-50"
                        >
                          Edit / Score
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </CmsAuthGuard>
  );
}
