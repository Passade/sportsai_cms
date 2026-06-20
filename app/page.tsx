"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import { getCmsEvents } from "@/lib/cms";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function getEventTitle(event: any) {
  if (event?.title) return event.title;

  return `${event?.homeTeam || "Home"} vs ${event?.awayTeam || "Away"}`;
}

function getStatusClass(status?: string) {
  const cleanStatus = String(status || "upcoming").toLowerCase();

  if (cleanStatus === "live") {
    return "bg-red-100 text-red-700";
  }

  if (cleanStatus === "vod") {
    return "bg-purple-100 text-purple-700";
  }

  if (cleanStatus === "completed") {
    return "bg-green-100 text-green-700";
  }

  if (cleanStatus === "cancelled" || cleanStatus === "hidden") {
    return "bg-slate-200 text-slate-600";
  }

  if (cleanStatus === "waiting") {
    return "bg-yellow-100 text-yellow-700";
  }

  return "bg-cyan-100 text-cyan-700";
}

function formatEventDate(date?: string) {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleString("en-GB", {
    timeZone: "Africa/Harare",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadEvents() {
    try {
      setLoading(true);

      const data = await getCmsEvents();

      setEvents(data || []);
    } catch (error) {
      console.error(error);
      alert("Could not load events. Check your Appwrite setup.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return events.filter((event) => {
      const status = String(event?.status || "").toLowerCase();

      const matchesStatus =
        statusFilter === "all" || status === statusFilter.toLowerCase();

      const searchText = [
        event?.title,
        event?.homeTeam,
        event?.awayTeam,
        event?.competition,
        event?.sport,
        event?.venue,
        event?.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !cleanQuery || searchText.includes(cleanQuery);

      return matchesStatus && matchesQuery;
    });
  }, [events, query, statusFilter]);

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] px-8 py-8 text-[#29496d]">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="text-cyan-600 font-medium">
              Back to dashboard
            </Link>

            <CmsLogoutButton />
          </div>

          <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[3px] text-cyan-600">
                CMS
              </p>

              <h1 className="mt-2 text-5xl font-bold">Events</h1>

              <p className="mt-3 max-w-2xl text-slate-500">
                Manage fixtures, upcoming matches, live streams and VOD replays
                from one place.
              </p>
            </div>

            <Link
              href="/events/create"
              className="inline-flex items-center justify-center rounded bg-cyan-500 px-8 py-4 text-lg font-bold text-white transition hover:bg-cyan-600"
            >
              + Create Event
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-[1fr_260px_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by team, competition, sport, venue..."
              className="h-14 w-full border border-slate-300 bg-white px-5 text-lg text-[#29496d] outline-none placeholder:text-[#9fb0c2] focus:border-cyan-500"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-14 w-full border border-slate-300 bg-white px-5 text-lg text-[#29496d] outline-none focus:border-cyan-500"
            >
              <option value="all">All statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="waiting">Waiting</option>
              <option value="completed">Completed</option>
              <option value="vod">VOD</option>
              <option value="cancelled">Cancelled</option>
              <option value="hidden">Hidden</option>
            </select>

            <button
              type="button"
              onClick={loadEvents}
              className="h-14 border border-slate-300 bg-white px-8 text-lg font-bold text-[#29496d] transition hover:border-cyan-400"
            >
              Refresh
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Total
              </p>
              <p className="mt-2 text-3xl font-bold">{events.length}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Upcoming
              </p>
              <p className="mt-2 text-3xl font-bold">
                {
                  events.filter(
                    (event) =>
                      String(event?.status || "").toLowerCase() === "upcoming"
                  ).length
                }
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Live
              </p>
              <p className="mt-2 text-3xl font-bold">
                {
                  events.filter(
                    (event) =>
                      String(event?.status || "").toLowerCase() === "live"
                  ).length
                }
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
                VOD
              </p>
              <p className="mt-2 text-3xl font-bold">
                {
                  events.filter(
                    (event) =>
                      String(event?.status || "").toLowerCase() === "vod"
                  ).length
                }
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8">
              <p className="text-slate-500">Loading events...</p>
            </div>
          ) : (
            <div className="mt-10 space-y-4">
              {filteredEvents.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-8">
                  <p className="text-2xl font-bold">No events found</p>

                  <p className="mt-2 text-slate-500">
                    Create your first fixture, live stream or VOD replay.
                  </p>

                  <Link
                    href="/events/create"
                    className="mt-6 inline-flex rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white transition hover:bg-cyan-600"
                  >
                    + Create Event
                  </Link>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <Link
                    key={event.$id}
                    href={`/events/${event.$id}`}
                    className="block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-2xl font-bold">
                            {getEventTitle(event)}
                          </p>

                          <span
                            className={`rounded-full px-4 py-1 text-sm font-bold ${getStatusClass(
                              event?.status
                            )}`}
                          >
                            {event?.status || "upcoming"}
                          </span>

                          {event?.isFeatured ? (
                            <span className="rounded-full bg-orange-100 px-4 py-1 text-sm font-bold text-orange-700">
                              Featured
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-slate-500">
                          {event?.competition || "Competition unavailable"} ·{" "}
                          {event?.sport || "Sport unavailable"}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {event?.venue || "Venue unavailable"}
                        </p>

                        <div className="mt-4 grid gap-2 text-sm text-slate-500 md:grid-cols-3">
                          <p>
                            <span className="font-bold text-[#29496d]">
                              Match:
                            </span>{" "}
                            {event?.homeTeam || "Home"} vs{" "}
                            {event?.awayTeam || "Away"}
                          </p>

                          <p>
                            <span className="font-bold text-[#29496d]">
                              Date:
                            </span>{" "}
                            {formatEventDate(event?.matchDate)}
                          </p>

                          <p>
                            <span className="font-bold text-[#29496d]">
                              Type:
                            </span>{" "}
                            {event?.vodType || "video"}
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
        </div>
      </main>
    </CmsAuthGuard>
  );
}
