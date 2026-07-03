"use client";

import {
  getSportTierCardById,
  updateSportTierCard,
} from "@/lib/SportTierCards";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const categories = [
  "Premium Sports",
  "Gold Sports",
  "Silver Sports",
  "Shows",
  "Starter Plan",
];

const sports = [
  "Rugby",
  "Football",
  "Hockey",
  "Cricket",
  "Swimming",
  "Waterpolo",
  "Volleyball",
  "Basketball",
  "Tennis",
  "Athletics",
  "Other",
];

export default function EditSportsTierCardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Premium Sports");
  const [sport, setSport] = useState("Rugby");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadCard() {
      try {
        setLoading(true);

        const card = await getSportTierCardById(params.id);

        setName(card.name || "");
        setCategory(card.category || "Premium Sports");
        setSport(card.sport || "Rugby");
        setImageUrl(card.imageUrl || "");
        setIsActive(Boolean(card.isActive));
      } catch (error) {
        console.error("Failed to load sports tier card:", error);
        alert("Failed to load sports tier card.");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadCard();
    }
  }, [params.id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      alert("Please enter a card name.");
      return;
    }

    try {
      setSaving(true);

      await updateSportTierCard(params.id, {
        name: name.trim(),
        category,
        sport,
        imageUrl: imageUrl.trim(),
        isActive,
      });

      router.push("/sports-tier-cards");
    } catch (error) {
      console.error("Failed to update sports tier card:", error);
      alert("Failed to update sports tier card.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/sports-tier-cards"
          className="text-sm font-bold text-blue-300"
        >
          ← Back to Sports Tier Cards
        </Link>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-3xl font-bold">Edit Sports Tier Card</h1>

          {loading ? (
            <p className="mt-6 text-slate-400">Loading card...</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="text-sm font-bold text-slate-300">
                  Card Name
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-300">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-300">
                  Sport
                </label>
                <select
                  value={sport}
                  onChange={(event) => setSport(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                >
                  {sports.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-300">
                  Image URL
                </label>
                <input
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
                />

                {imageUrl ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="h-56 w-full object-cover"
                    />
                  </div>
                ) : null}
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                />
                <span className="text-sm font-bold text-slate-300">
                  Active in app
                </span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-white px-5 py-4 font-bold text-slate-950 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}