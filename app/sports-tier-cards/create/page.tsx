"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsImageUpload from "@/components/cms-image-upload";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  CreateSportTierCardInput,
  createCmsSportsTierCard,
} from "@/lib/SportTierCards";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const initialForm: CreateSportTierCardInput = {
  name: "",
  category: "Premium Sports",
  sport: "Rugby",
  imageUrl: "",
  isActive: true,
};

const categories = [
  "Premium Sports",
  "Gold Sports",
  "Silver Sports",
  "Starter Plan",
  "Shows",
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
  "Athletics",
  "Other",
];

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function CreateSportsTierCardPage() {
  const router = useRouter();
  const [form, setForm] = useState<CreateSportTierCardInput>(initialForm);
  const [saving, setSaving] = useState(false);

  function updateField(
    key: keyof CreateSportTierCardInput,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Add a card name.");
      return;
    }

    if (!form.category.trim()) {
      alert("Choose a category.");
      return;
    }

    if (!form.sport.trim()) {
      alert("Choose a sport.");
      return;
    }

    if (!form.imageUrl.trim()) {
      alert("Upload or paste an image URL.");
      return;
    }

    try {
      setSaving(true);

      await createCmsSportsTierCard({
        ...form,
        name: form.name.trim(),
        category: form.category.trim(),
        sport: form.sport.trim(),
        imageUrl: form.imageUrl.trim(),
      });

      router.push("/sports-tier-cards");
    } catch (error: any) {
      console.error("Create sports tier card error:", error);
      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not create sports tier card."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] text-[#29496d]">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-5 px-8 py-6">
            <div>
              <Link
                href="/sports-tier-cards"
                prefetch={false}
                className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
              >
                ← Sports Tier Cards
              </Link>

              <h1 className="mt-2 text-4xl font-bold">Create Sports Tier Card</h1>

              <p className="mt-2 text-slate-500">
                Add a new card to the Appwrite sport_tier_cards collection.
              </p>
            </div>

            <CmsLogoutButton />
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mx-auto grid max-w-5xl gap-6 px-8 py-10"
        >
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#29496d]">Card Details</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field
                label="Card Name"
                value={form.name}
                onChange={(value) => updateField("name", value)}
                placeholder="Example: Derby Day"
              />

              <SelectField
                label="Category"
                value={form.category}
                onChange={(value) => updateField("category", value)}
                options={categories}
              />

              <SelectField
                label="Sport"
                value={form.sport}
                onChange={(value) => updateField("sport", value)}
                options={sports}
              />

              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
                Uploading below uses your existing CMS image upload component, so it keeps the same compression and upload flow as Ads.
              </div>

              <div className="md:col-span-2">
                <Field
                  label="Image URL"
                  value={form.imageUrl}
                  onChange={(value) => updateField("imageUrl", value)}
                  placeholder="Upload below or paste an ImageKit/Appwrite image URL"
                />
              </div>

              <div className="md:col-span-2">
                <CmsImageUpload
                  label="Upload Sports Tier Image"
                  value={form.imageUrl}
                  onUploaded={(url) => updateField("imageUrl", url)}
                />
              </div>
            </div>

            <label className="mt-6 flex items-center gap-3">
              <input
                checked={form.isActive}
                onChange={(event) =>
                  updateField("isActive", event.target.checked)
                }
                type="checkbox"
                className="h-5 w-5"
              />

              <span className="font-bold text-[#29496d]">Active card</span>
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/sports-tier-cards"
              prefetch={false}
              className="rounded border border-slate-200 bg-white px-7 py-4 text-lg font-bold text-[#29496d]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create Card"}
            </button>
          </div>
        </form>
      </main>
    </CmsAuthGuard>
  );
}
