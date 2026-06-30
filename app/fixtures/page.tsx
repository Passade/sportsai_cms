"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  getCmsErrorMessage,
  useCmsToast,
} from "@/components/cms-toast-provider";
import {
  CmsFixture,
  deleteCmsFixture,
  FixtureDateRange,
  FixtureStatus,
  getCmsFixturesPage,
} from "@/lib/cms";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 500;

const STATUS_FILTERS: Array<FixtureStatus | "all"> = [
  "upcoming",
  "live",
  "completed",
  "cancelled",
  "hidden",
  "all",
];

const DATE_FILTERS: Array<{ label: string; value: FixtureDateRange }> = [
  { label: "All dates", value: "all" },
  { label: "Today", value: "today" },
  { label: "Next 7 days", value: "week" },
  { label: "Future", value: "future" },
  { label: "Past", value: "past" },
];

function formatDate(value?: string) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function statusClass(status?: string) {
  const value = String(status || "").toLowerCase();

  if (value === "live") return "bg-red-100 text-red-700";
  if (value === "upcoming") return "bg-cyan-100 text-cyan-700";
  if (value === "completed") return "bg-emerald-100 text-emerald-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-600";
  if (value === "hidden") return "bg-zinc-200 text-zinc-700";

  return "bg-slate-100 text-slate-600";
}

function fixtureTitle(fixture: CmsFixture) {
  return `${fixture.homeTeam || "Home"} vs ${fixture.awayTeam || "Away"}`;
}

function normalizeSearch(value: string) {
  const trimmed = value.trim().toLowerCase();

  if (trimmed.length < 2) {
    return "";
  }

  return trimmed;
}

export default function FixturesPage() {
  const { showSuccess, showError, showWarning } = useCmsToast();

  const [fixtures, setFixtures] = useState<CmsFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const [statusFilter, setStatusFilter] = useState<FixtureStatus | "all">(
    "upcoming"
  );
  const [dateRange, setDateRange] = useState<FixtureDateRange>("all");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previousCursor, setPreviousCursor] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  const visibleIds = fixtures.map((fixture) => fixture.$id);
  const selectedInVisible = selectedIds.filter((id) => visibleIds.includes(id));

  const allVisibleSelected =
    fixtures.length > 0 &&
    fixtures.every((fixture) => selectedIds.includes(fixture.$id));

  const searchHelper = useMemo(() => {
    if (!searchInput.trim()) {
      return "Search is off.";
    }

    if (searchInput.trim().length < 2) {
      return "Type at least 2 characters before the CMS searches Appwrite.";
    }

    return `Searching Appwrite for “${searchInput.trim()}”.`;
  }, [searchInput]);

  async function loadFixtures(options?: {
    cursor?: string;
    direction?: "next" | "previous";
    status?: FixtureStatus | "all";
    range?: FixtureDateRange;
    search?: string;
    reset?: boolean;
  }) {
    try {
      setLoading(true);

      const data = await getCmsFixturesPage({
        cursor: options?.cursor,
        direction: options?.direction,
        status: options?.status ?? statusFilter,
        dateRange: options?.range ?? dateRange,
        search: options?.search ?? appliedSearch,
        limit: PAGE_SIZE,
      });

      setFixtures(data.documents);
      setNextCursor(data.nextCursor);
      setPreviousCursor(data.previousCursor);
      setSelectedIds([]);

      if (options?.reset) {
        setPageNumber(1);
      }
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
    loadFixtures({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const nextSearch = normalizeSearch(searchInput);

    if (nextSearch === appliedSearch) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setAppliedSearch(nextSearch);

      loadFixtures({
        status: statusFilter,
        range: dateRange,
        search: nextSearch,
        reset: true,
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((selectedId) => !visibleIds.includes(selectedId))
      );
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
  }

  async function handleStatusChange(status: FixtureStatus | "all") {
    setStatusFilter(status);

    await loadFixtures({
      status,
      range: dateRange,
      search: appliedSearch,
      reset: true,
    });
  }

  async function handleDateRangeChange(nextRange: FixtureDateRange) {
    setDateRange(nextRange);

    await loadFixtures({
      status: statusFilter,
      range: nextRange,
      search: appliedSearch,
      reset: true,
    });
  }

  async function refreshFixtures() {
    await loadFixtures({
      status: statusFilter,
      range: dateRange,
      search: appliedSearch,
      reset: true,
    });
  }

  async function goToNextPage() {
    if (!nextCursor || loading) return;

    await loadFixtures({
      cursor: nextCursor,
      direction: "next",
      status: statusFilter,
      range: dateRange,
      search: appliedSearch,
    });

    setPageNumber((current) => current + 1);
  }

  async function goToPreviousPage() {
    if (!previousCursor || loading || pageNumber <= 1) return;

    await loadFixtures({
      cursor: previousCursor,
      direction: "previous",
      status: statusFilter,
      range: dateRange,
      search: appliedSearch,
    });

    setPageNumber((current) => Math.max(1, current - 1));
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

    if (!confirmed) return;

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
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-8 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/"
                prefetch={false}
                className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-4xl font-bold">Fixtures</h1>

              <p className="mt-2 text-slate-500">
                Defaults to upcoming fixtures and loads {PAGE_SIZE} summary
                records only.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={refreshFixtures}
                disabled={loading}
                className="rounded border border-slate-200 bg-white px-5 py-4 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>

              <Link
                href="/fixtures/create"
                prefetch={false}
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
            <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr_1.2fr] lg:items-start">
              <div>
                <label className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Server search
                </label>

                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search teams, sport, competition, venue..."
                  className="mt-3 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                />

                <p className="mt-2 text-xs text-slate-400">{searchHelper}</p>
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Status filter
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((status) => {
                    const active = statusFilter === status;

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatusChange(status)}
                        disabled={loading}
                        className={`rounded-full px-4 py-2 text-sm font-bold capitalize transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          active
                            ? "bg-cyan-500 text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Date filter
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {DATE_FILTERS.map((item) => {
                    const active = dateRange === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleDateRangeChange(item.value)}
                        disabled={loading}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          active
                            ? "bg-[#29496d] text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-3 font-bold text-[#29496d]">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="h-5 w-5"
                  />

                  Select all visible
                </label>

                <span className="text-sm font-semibold text-slate-500">
                  {selectedIds.length} selected
                  {selectedInVisible.length !== selectedIds.length
                    ? ` · ${selectedInVisible.length} visible`
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
                  {deleting ? "Deleting..." : "Delete Visible Selected"}
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              Loading {PAGE_SIZE} fixtures...
            </div>
          ) : fixtures.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              No fixtures found for this filter.
            </div>
          ) : (
            <div className="grid gap-5">
              {fixtures.map((fixture) => {
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
                            aria-label={`Select ${fixtureTitle(fixture)}`}
                          />
                        </label>

                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusClass(
                                fixture.status
                              )}`}
                            >
                              {fixture.status || "upcoming"}
                            </span>

                            {fixture.isStreamed ? (
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-700">
                                Streamed
                              </span>
                            ) : null}
                          </div>

                          <h2 className="mt-4 text-2xl font-bold text-[#29496d]">
                            {fixtureTitle(fixture)}
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
                          prefetch={false}
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

          <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-base font-bold text-[#29496d]">
                Page {pageNumber}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Showing up to {PAGE_SIZE} fixtures. No extra total-count query is
                used.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={loading || pageNumber === 1 || !previousCursor}
                onClick={goToPreviousPage}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ← Previous
              </button>

              <button
                type="button"
                disabled={loading || !nextCursor || fixtures.length < PAGE_SIZE}
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
