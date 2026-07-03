"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  CmsSportTierCard,
  deleteCmsSportsTierCard,
  getCmsSportsTierCardsPage,
  setCmsSportsTierCardActive,
} from "@/lib/SportTierCards";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 25;

type ActiveFilter = "all" | "active" | "inactive";

function formatDate(value?: string) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function getCardTitle(card: CmsSportTierCard) {
  return card.name || "Untitled card";
}

export default function SportsTierCardsPage() {
  const [cards, setCards] = useState<CmsSportTierCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previousCursor, setPreviousCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [pageNumber, setPageNumber] = useState(1);

  async function loadCards(options?: {
    cursor?: string;
    direction?: "next" | "previous";
    reset?: boolean;
  }) {
    try {
      setLoading(true);

      const data = await getCmsSportsTierCardsPage({
        cursor: options?.cursor,
        direction: options?.direction,
        active: activeFilter,
        limit: PAGE_SIZE,
      });

      setCards(data.documents);
      setTotal(data.total);
      setNextCursor(data.nextCursor);
      setPreviousCursor(data.previousCursor);

      if (options?.reset) {
        setCursorHistory([]);
        setPageNumber(1);
      }
    } catch (error: any) {
      console.error("Sports tier cards load error:", error);
      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not load sports tier cards. Check your Appwrite setup."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCards({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  const visibleCards = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return cards;

    return cards.filter((card) =>
      [card.name, card.category, card.sport, card.$id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(cleanQuery)
    );
  }, [cards, query]);

  async function refreshCards() {
    await loadCards({ reset: true });
  }

  async function goToNextPage() {
    if (!nextCursor || loading) return;

    const currentFirstCursor = previousCursor;

    await loadCards({
      cursor: nextCursor,
      direction: "next",
    });

    if (currentFirstCursor) {
      setCursorHistory((current) => [...current, currentFirstCursor]);
    }

    setPageNumber((current) => current + 1);
  }

  async function goToPreviousPage() {
    if (loading || pageNumber <= 1) return;

    const history = [...cursorHistory];
    const cursor = history.pop();

    if (!cursor) {
      await loadCards({ reset: true });
      return;
    }

    await loadCards({
      cursor,
      direction: "previous",
    });

    setCursorHistory(history);
    setPageNumber((current) => Math.max(1, current - 1));
  }

  async function toggleActive(card: CmsSportTierCard) {
    try {
      setSavingId(card.$id);

      const updated = await setCmsSportsTierCardActive(card.$id, !card.isActive);

      setCards((current) =>
        current.map((item) => (item.$id === card.$id ? updated : item))
      );
    } catch (error: any) {
      console.error("Sports tier card active update error:", error);
      alert(error?.message || "Could not update card status.");
    } finally {
      setSavingId("");
    }
  }

  async function handleDelete(card: CmsSportTierCard) {
    if (!window.confirm(`Delete ${getCardTitle(card)}? This cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(card.$id);

      await deleteCmsSportsTierCard(card.$id);

      setCards((current) => current.filter((item) => item.$id !== card.$id));
      setTotal((current) => Math.max(0, current - 1));
    } catch (error: any) {
      console.error("Sports tier card delete error:", error);
      alert(error?.message || "Could not delete sports tier card.");
    } finally {
      setDeletingId("");
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
                prefetch={false}
                className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-4xl font-bold">Sports Tier Cards</h1>

              <p className="mt-2 text-slate-500">
                Manage cards from the Appwrite sport_tier_cards collection.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={refreshCards}
                disabled={loading}
                className="rounded border border-slate-200 bg-white px-5 py-4 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>

              <Link
                href="/sports-tier-cards/create"
                prefetch={false}
                className="rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white transition hover:bg-cyan-600"
              >
                + Create Card
              </Link>

              <CmsLogoutButton />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="mb-6 grid gap-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_260px]">
            <label>
              <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Search loaded cards
              </span>

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, category, sport or card ID..."
                className="mt-3 h-14 w-full rounded border border-slate-200 bg-white px-5 text-[#29496d] outline-none placeholder:text-[#9fb0c2] focus:border-cyan-500"
              />
            </label>

            <label>
              <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Status
              </span>

              <select
                value={activeFilter}
                onChange={(event) =>
                  setActiveFilter(event.target.value as ActiveFilter)
                }
                className="mt-3 h-14 w-full rounded border border-slate-200 bg-white px-5 text-[#29496d] outline-none focus:border-cyan-500"
              >
                <option value="all">All cards</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              Loading sports tier cards...
            </div>
          ) : visibleCards.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8">
              <p className="text-2xl font-bold">No sports tier cards found</p>

              <p className="mt-2 text-slate-500">
                Create your first card so it can appear in the app Sports Tier section.
              </p>

              <Link
                href="/sports-tier-cards/create"
                prefetch={false}
                className="mt-6 inline-flex rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white transition hover:bg-cyan-600"
              >
                + Create Card
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleCards.map((card) => (
                <article
                  key={card.$id}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg"
                >
                  {card.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.imageUrl}
                      alt={card.name || "Sports tier card"}
                      loading="lazy"
                      className="h-44 w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-44 w-full items-center justify-center rounded-2xl bg-slate-100 text-lg font-bold text-slate-400">
                      No image
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                        card.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {card.isActive ? "Active" : "Inactive"}
                    </span>

                    <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-700">
                      {card.category || "No category"}
                    </span>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                      {card.sport || "No sport"}
                    </span>
                  </div>

                  <h2 className="mt-4 line-clamp-2 text-2xl font-bold text-[#29496d]">
                    {getCardTitle(card)}
                  </h2>

                  <p className="mt-2 text-xs text-slate-400">
                    Updated {formatDate(card.$updatedAt)}
                  </p>

                  <p className="mt-2 break-all text-xs text-slate-400">
                    ID: {card.$id}
                  </p>

                  <div className="mt-5 grid gap-2">
                    <Link
                      href={`/sports-tier-cards/${card.$id}`}
                      prefetch={false}
                      className="rounded bg-cyan-500 px-4 py-3 text-center font-bold text-white transition hover:bg-cyan-600"
                    >
                      Edit
                    </Link>

                    <button
                      type="button"
                      onClick={() => toggleActive(card)}
                      disabled={savingId === card.$id || deletingId === card.$id}
                      className="rounded border border-slate-200 bg-white px-4 py-3 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingId === card.$id
                        ? "Saving..."
                        : card.isActive
                        ? "Deactivate"
                        : "Activate"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(card)}
                      disabled={deletingId === card.$id}
                      className="rounded border border-red-200 bg-white px-4 py-3 font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === card.$id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-base font-bold text-[#29496d]">
                Page {pageNumber}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Showing up to {PAGE_SIZE} cards from {total} matching records.
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
                disabled={loading || !nextCursor || cards.length < PAGE_SIZE}
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
