"use client";

import {
  deleteSportTierCard,
  getSportTierCards,
  type SportTierCard,
} from "@/lib/SportTierCards";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SportsTierCardsPage() {
  const [cards, setCards] = useState<SportTierCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");

  async function loadCards() {
    try {
      setLoading(true);
      const result = await getSportTierCards();
      setCards(result);
    } catch (error) {
      console.error("Failed to load sports tier cards:", error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Delete this sports tier card? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      await deleteSportTierCard(id);
      await loadCards();
    } catch (error) {
      console.error("Failed to delete sports tier card:", error);
      alert("Failed to delete sports tier card.");
    } finally {
      setDeletingId("");
    }
  }

  useEffect(() => {
    loadCards();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Sports Tier Cards</h1>
            <p className="mt-2 text-sm text-slate-400">
              Create, edit and manage the cards shown in the app Sports Tier
              section.
            </p>
          </div>

          <Link
            href="/sports-tier-cards/create"
            className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950"
          >
            Add Card
          </Link>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-300">
            Loading sports tier cards...
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-bold">No cards yet</h2>
            <p className="mt-2 text-slate-400">
              Add your first sports tier card to show it in your app.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.$id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"
              >
                <div className="h-44 bg-slate-900">
                  {card.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.imageUrl}
                      alt={card.name || "Sports tier card"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      No image
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        card.isActive
                          ? "bg-emerald-400/15 text-emerald-300"
                          : "bg-red-400/15 text-red-300"
                      }`}
                    >
                      {card.isActive ? "Active" : "Inactive"}
                    </span>

                    <span className="rounded-full bg-blue-400/10 px-3 py-1 text-xs font-bold text-blue-300">
                      {card.category || "No category"}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold">
                    {card.name || "Untitled card"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    {card.sport || "No sport"}
                  </p>

                  <div className="mt-5 flex gap-3">
                    <Link
                      href={`/sports-tier-cards/${card.$id}`}
                      className="flex-1 rounded-full bg-white px-4 py-3 text-center text-sm font-bold text-slate-950"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() => handleDelete(card.$id)}
                      disabled={deletingId === card.$id}
                      className="rounded-full border border-red-400/30 px-4 py-3 text-sm font-bold text-red-300 disabled:opacity-50"
                    >
                      {deletingId === card.$id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}