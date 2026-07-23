"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import { Client, Databases, Models, Query } from "appwrite";
import { useEffect, useMemo, useState } from "react";

type SportTierCard = Models.Document & {
  name?: string;
  title?: string;
  category?: string;
  sport?: string;
  imageUrl?: string;
  matchKeyword?: string;
  active?: boolean;
};

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
const cardsCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_SPORT_TIER_CARDS_COLLECTION_ID || "";

const client = new Client();

if (endpoint && projectId) {
  client.setEndpoint(endpoint).setProject(projectId);
}

const databases = new Databases(client);

function normalizeCategory(value?: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isStarterPlan(value?: string) {
  const category = normalizeCategory(value);

  return (
    category === "starter" ||
    category === "starter plan" ||
    category === "starter sport" ||
    category === "starter sports"
  );
}

function getCardTitle(card: SportTierCard) {
  return card.name || card.title || "Untitled Starter Plan card";
}

export default function StarterPlanYouTubeSyncPage() {
  const [cards, setCards] = useState<SportTierCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [syncSecret, setSyncSecret] = useState("");
  const [loadingCards, setLoadingCards] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const selectedCard = useMemo(() => {
    return cards.find((card) => card.$id === selectedCardId) || null;
  }, [cards, selectedCardId]);

  useEffect(() => {
    let mounted = true;

    async function loadStarterCards() {
      try {
        setLoadingCards(true);

        if (!databaseId || !cardsCollectionId) {
          throw new Error("Missing Sport Tier card collection configuration.");
        }

        const result = await databases.listDocuments<SportTierCard>(
          databaseId,
          cardsCollectionId,
          [Query.limit(100), Query.orderDesc("$createdAt")]
        );

        if (!mounted) return;

        const starterCards = result.documents
          .filter((card) => card.active !== false)
          .filter((card) => isStarterPlan(card.category))
          .sort((a, b) =>
            getCardTitle(a).localeCompare(getCardTitle(b))
          );

        setCards(starterCards);

        if (starterCards.length === 1) {
          setSelectedCardId(starterCards[0].$id);
        }
      } catch (error) {
        if (!mounted) return;

        setIsError(true);
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not load Starter Plan cards."
        );
      } finally {
        if (mounted) {
          setLoadingCards(false);
        }
      }
    }

    void loadStarterCards();

    return () => {
      mounted = false;
    };
  }, []);

  async function syncPlaylist() {
    if (!selectedCardId) {
      setIsError(true);
      setMessage("Choose the Starter Plan category card first.");
      return;
    }

    if (!playlistUrl.trim()) {
      setIsError(true);
      setMessage("Paste a YouTube playlist URL.");
      return;
    }

    if (!syncSecret.trim()) {
      setIsError(true);
      setMessage("Enter your playlist sync secret.");
      return;
    }

    try {
      setSyncing(true);
      setMessage("");
      setIsError(false);

      const response = await fetch("/api/youtube-playlist/sync-starter-plan", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          cardId: selectedCardId,
          playlistUrl: playlistUrl.trim(),
          syncSecret: syncSecret.trim(),
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Playlist sync failed.");
      }

      setMessage(
        `${payload.message} ${payload.skipped} existing video${
          payload.skipped === 1 ? "" : "s"
        } skipped.`
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not sync the playlist."
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
              Starter Plan
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              Sync a YouTube playlist
            </h1>

            <p className="mt-3 leading-7 text-slate-400">
              Choose one Starter Plan category card, paste its YouTube
              playlist once, and import only videos that are not already saved
              in Appwrite. The mobile card page will show them in a horizontal
              carousel.
            </p>

            <div className="mt-8 space-y-6">
              <label className="block">
                <span className="text-sm font-bold text-slate-300">
                  Starter Plan category card
                </span>

                <select
                  value={selectedCardId}
                  onChange={(event) => setSelectedCardId(event.target.value)}
                  disabled={loadingCards || syncing}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none focus:border-cyan-400"
                >
                  <option value="">
                    {loadingCards
                      ? "Loading Starter Plan cards..."
                      : "Select a Starter Plan card"}
                  </option>

                  {cards.map((card) => (
                    <option key={card.$id} value={card.$id}>
                      {getCardTitle(card)}
                    </option>
                  ))}
                </select>
              </label>

              {selectedCard ? (
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-slate-300">
                  Videos will be saved with competition:
                  <strong className="ml-2 text-white">
                    {selectedCard.matchKeyword || getCardTitle(selectedCard)}
                  </strong>
                </div>
              ) : null}

              <label className="block">
                <span className="text-sm font-bold text-slate-300">
                  YouTube playlist URL
                </span>

                <input
                  value={playlistUrl}
                  onChange={(event) => setPlaylistUrl(event.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=PL..."
                  disabled={syncing}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-300">
                  Sync secret
                </span>

                <input
                  value={syncSecret}
                  onChange={(event) => setSyncSecret(event.target.value)}
                  type="password"
                  placeholder="Your YOUTUBE_PLAYLIST_SYNC_SECRET"
                  disabled={syncing}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400"
                />
              </label>

              <button
                type="button"
                onClick={syncPlaylist}
                disabled={syncing || loadingCards}
                className="w-full rounded-xl bg-cyan-400 px-6 py-4 text-lg font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {syncing ? "Syncing playlist..." : "Sync Playlist"}
              </button>

              {message ? (
                <div
                  className={`rounded-2xl border px-4 py-4 text-sm ${
                    isError
                      ? "border-red-400/30 bg-red-400/10 text-red-100"
                      : "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                  }`}
                >
                  {message}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </CmsAuthGuard>
  );
}
