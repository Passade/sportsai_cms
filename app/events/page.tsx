"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  deleteCmsEventAndFixture,
  EventStatus,
  getCmsEventsPage,
} from "@/lib/cms";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CmsEvent = {
  $id: string;
  title?: string;
  status?: EventStatus | string;
  homeTeam?: string;
  awayTeam?: string;
  matchDate?: string;
  venue?: string;
  thumbnail?: string;
  competition?: string;
  isFeatured?: boolean;
  sport?: string;
  vodType?: string;
  fixturesId?: string;
  searchText?: string;
  $createdAt?: string;
  $updatedAt?: string;
};

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 500;

const STATUS_FILTERS: Array<EventStatus | "all"> = [
  "all",
  "upcoming",
  "live",
  "waiting",
  "completed",
  "cancelled",
  "vod",
  "hidden",
];

function formatDate(value?: string) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusStyle(status?: string) {
  const value = String(status || "").toLowerCase();

  if (value === "live") return "bg-red-100 text-red-700";
  if (value === "upcoming") return "bg-cyan-100 text-cyan-700";
  if (value === "waiting") return "bg-amber-100 text-amber-700";
  if (value === "completed") return "bg-emerald-100 text-emerald-700";
  if (value === "cancelled") return "bg-slate-200 text-slate-600";
  if (value === "vod") return "bg-purple-100 text-purple-700";
  if (value === "hidden") return "bg-zinc-200 text-zinc-700";

  return "bg-slate-100 text-slate-600";
}

function eventTitle(event: CmsEvent) {
  const title = event.title?.trim();

  if (title) return title;

  const home = event.homeTeam?.trim() || "Home";
  const away = event.awayTeam?.trim() || "Away";

  return `${home} vs ${away}`;
}

function normalizeSearch(value: string) {
  const trimmed = value.trim().toLowerCase();

  if (trimmed.length < 2) {
    return "";
  }

  return trimmed;
}

function EventCard({
  event,
  onDelete,
  deleting,
}: {
  event: CmsEvent;
  onDelete: (event: CmsEvent) => void;
  deleting: boolean;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="h-24 w-32 overflow-hidden rounded-2xl bg-slate-100">
            {event.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.thumbnail}
                alt={eventTitle(event)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-400">
                No image
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusStyle(
                  event.status
                )}`}
              >
                {event.status || "unknown"}
              </span>

              {event.isFeatured ? (
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-yellow-700">
                  Featured
                </span>
              ) : null}

              {event.vodType ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {event.vodType}
                </span>
              ) : null}
            </div>

            <h2 className="mt-3 text-2xl font-bold text-[#29496d]">
              {eventTitle(event)}
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {event.competition || "No competition"}
            </p>

            <div className="mt-3 grid gap-1 text-sm text-slate-500">
              <p>
                <span className="font-bold text-slate-600">Date:</span>{" "}
                {formatDate(event.matchDate)}
              </p>

              <p>
                <span className="font-bold text-slate-600">Venue:</span>{" "}
                {event.venue || "No venue"}
              </p>

              <p>
                <span className="font-bold text-slate-600">Sport:</span>{" "}
                {event.sport || "No sport"}
              </p>

              <p>
                <span className="font-bold text-slate-600">Event ID:</span>{" "}
                {event.$id}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link
            href={`/events/${event.$id}`}
            prefetch={false}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-[#29496d] transition hover:bg-slate-50"
          >
            Edit
          </Link>

          <button
            type="button"
            disabled={deleting}
            onClick={() => onDelete(event)}
            className="rounded-xl bg-red-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<CmsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previousCursor, setPreviousCursor] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const searchHelper = useMemo(() => {
    if (!searchInput.trim()) {
      return "Search is off.";
    }

    if (searchInput.trim().length < 2) {
      return "Type at least 2 characters before the CMS searches Appwrite.";
    }

    return `Searching Appwrite for “${searchInput.trim()}”.`;
  }, [searchInput]);

  async function loadEvents(options?: {
    cursor?: string;
    direction?: "next" | "previous";
    status?: EventStatus | "all";
    search?: string;
    reset?: boolean;
  }) {
    try {
      setLoading(true);

      const data = await getCmsEventsPage({
        cursor: options?.cursor,
        direction: options?.direction,
        status: options?.status ?? statusFilter,
        search: options?.search ?? appliedSearch,
        limit: PAGE_SIZE,
      });

      setEvents(data.documents as CmsEvent[]);
      setNextCursor(data.nextCursor);
      setPreviousCursor(data.previousCursor);

      if (options?.reset) {
        setPageNumber(1);
      }
    } catch (error: any) {
      console.error("Events load error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not load events."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(status: EventStatus | "all") {
    setStatusFilter(status);

    await loadEvents({
      status,
      search: appliedSearch,
      reset: true,
    });
  }

  async function refreshEvents() {
    await loadEvents({
      status: statusFilter,
      search: appliedSearch,
      reset: true,
    });
  }

  async function goToNextPage() {
    if (!nextCursor || loading) return;

    await loadEvents({
      cursor: nextCursor,
      direction: "next",
      status: statusFilter,
      search: appliedSearch,
    });

    setPageNumber((current) => current + 1);
  }

  async function goToPreviousPage() {
    if (!previousCursor || loading || pageNumber <= 1) return;

    await loadEvents({
      cursor: previousCursor,
      direction: "previous",
      status: statusFilter,
      search: appliedSearch,
    });

    setPageNumber((current) => Math.max(1, current - 1));
  }

  async function handleDelete(event: CmsEvent) {
    const title = eventTitle(event);

    const confirmed = window.confirm(
      `Delete "${title}"?\n\nThis will also try to delete the linked fixture if one exists.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(event.$id);

      await deleteCmsEventAndFixture(event.$id, event.fixturesId);

      setEvents((current) => current.filter((item) => item.$id !== event.$id));
    } catch (error: any) {
      console.error("Delete event error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not delete event."
      );
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadEvents({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const nextSearch = normalizeSearch(searchInput);

    if (nextSearch === appliedSearch) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setAppliedSearch(nextSearch);

      loadEvents({
        status: statusFilter,
        search: nextSearch,
        reset: true,
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] text-[#29496d]">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-8 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[3px] text-cyan-600">
                SportsAI CMS
              </p>

              <h1 className="mt-2 text-4xl font-bold">Events / Live Streams</h1>

              <p className="mt-2 text-slate-500">
                Loads {PAGE_SIZE} summary records only. Full details load only
                when you open an event.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={refreshEvents}
                disabled={loading}
                className="rounded border border-slate-200 bg-white px-5 py-4 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>

              <Link
                href="/"
                prefetch={false}
                className="rounded border border-slate-200 bg-white px-5 py-4 font-bold text-[#29496d] transition hover:bg-slate-50"
              >
                Dashboard
              </Link>

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

        <section className="mx-auto max-w-7xl px-8 py-8">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr] lg:items-start">
              <div>
                <label className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Server search
                </label>

                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search title, team, competition, venue, sport..."
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
            </div>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
                <p className="text-lg font-bold text-[#29496d]">
                  Loading {PAGE_SIZE} events...
                </p>
              </div>
            ) : events.length ? (
              <div className="grid gap-5">
                {events.map((event) => (
                  <EventCard
                    key={event.$id}
                    event={event}
                    onDelete={handleDelete}
                    deleting={deletingId === event.$id}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
                <p className="text-lg font-bold text-[#29496d]">
                  No events found
                </p>
                <p className="mt-2 text-slate-500">
                  Try another status or search term.
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-base font-bold text-[#29496d]">
                Page {pageNumber}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Showing up to {PAGE_SIZE} events. No extra total-count query is
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
                disabled={loading || !nextCursor || events.length < PAGE_SIZE}
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
