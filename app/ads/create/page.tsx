"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsImageUpload from "@/components/cms-image-upload";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  CreateAdBannerInput,
  createCmsAdBanner,
} from "@/lib/ads";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const initialForm: CreateAdBannerInput = {
  title: "",
  imageUrl: "",
  linkType: "",
  linkId: "",
  sortOrder: "999",
  isActive: true,
};

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

export default function CreateAdPage() {
  const router = useRouter();
  const [form, setForm] = useState<CreateAdBannerInput>(initialForm);
  const [saving, setSaving] = useState(false);

  function updateField(key: keyof CreateAdBannerInput, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      alert("Add an ad title.");
      return;
    }

    if (!form.imageUrl.trim()) {
      alert("Upload or paste an image URL.");
      return;
    }

    try {
      setSaving(true);

      await createCmsAdBanner(form);

      router.push("/ads");
    } catch (error: any) {
      console.error("Create ad error:", error);
      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not create ad."
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
                href="/ads"
                prefetch={false}
                className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
              >
                ← Ads
              </Link>

              <h1 className="mt-2 text-4xl font-bold">Create Ad</h1>

              <p className="mt-2 text-slate-500">
                Add a new ad banner to the Appwrite ad_banners collection.
              </p>
            </div>

            <CmsLogoutButton />
          </div>
        </section>

        <form onSubmit={handleSubmit} className="mx-auto grid max-w-5xl gap-6 px-8 py-10">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#29496d]">Ad Details</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field
                label="Title"
                value={form.title}
                onChange={(value) => updateField("title", value)}
                placeholder="Example: Derby Day sponsor"
              />

              <Field
                label="Sort Order"
                value={form.sortOrder}
                onChange={(value) => updateField("sortOrder", value)}
                type="number"
              />

              <Field
                label="Link Type"
                value={form.linkType}
                onChange={(value) => updateField("linkType", value)}
                placeholder="Example: fixture, team, external"
              />

              <Field
                label="Link ID"
                value={form.linkId}
                onChange={(value) => updateField("linkId", value)}
                placeholder="Example: fixture ID, team ID, or URL slug"
              />

              <div className="md:col-span-2">
                <Field
                  label="Image URL"
                  value={form.imageUrl}
                  onChange={(value) => updateField("imageUrl", value)}
                  placeholder="Upload below or paste a URL"
                />
              </div>

              <div className="md:col-span-2">
                <CmsImageUpload
                  label="Upload Ad Image"
                  value={form.imageUrl}
                  onUploaded={(url) => updateField("imageUrl", url)}
                />
              </div>
            </div>

            <label className="mt-6 flex items-center gap-3">
              <input
                checked={form.isActive}
                onChange={(event) => updateField("isActive", event.target.checked)}
                type="checkbox"
                className="h-5 w-5"
              />

              <span className="font-bold text-[#29496d]">Active ad</span>
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/ads"
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
              {saving ? "Saving..." : "Create Ad"}
            </button>
          </div>
        </form>
      </main>
    </CmsAuthGuard>
  );
}
