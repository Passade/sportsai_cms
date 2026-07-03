"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsImageUpload from "@/components/cms-image-upload";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  CmsAdBanner,
  CreateAdBannerInput,
  deleteCmsAdBanner,
  getCmsAdBannerById,
  updateCmsAdBanner,
} from "@/lib/ads";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function getInitialForm(ad?: CmsAdBanner): CreateAdBannerInput {
  return {
    title: ad?.title || "",
    imageUrl: ad?.imageUrl || "",
    linkType: ad?.linkType || "external",
    linkId: ad?.linkId || "",
    sortOrder: String(ad?.sortOrder ?? 999),
    isActive: Boolean(ad?.isActive),
  };
}

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

export default function EditAdPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [ad, setAd] = useState<CmsAdBanner | null>(null);
  const [form, setForm] = useState<CreateAdBannerInput>(getInitialForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadAd() {
    try {
      setLoading(true);

      const data = await getCmsAdBannerById(params.id);

      setAd(data);
      setForm(getInitialForm(data));
    } catch (error: any) {
      console.error("Ad detail load error:", error);
      alert(error?.message || "Could not load ad.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (params.id) {
      loadAd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

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

    if (form.linkType.trim().toLowerCase() === "external" && !form.linkId.trim()) {
      alert("Add the website URL in Link URL / Internal ID.");
      return;
    }

    try {
      setSaving(true);

      await updateCmsAdBanner(params.id, {
        ...form,
        linkType: form.linkType.trim(),
        linkId: form.linkId.trim(),
      });

      router.push("/ads");
    } catch (error: any) {
      console.error("Update ad error:", error);
      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not save ad."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this ad? This cannot be undone.")) {
      return;
    }

    try {
      setDeleting(true);

      await deleteCmsAdBanner(params.id);

      router.push("/ads");
    } catch (error: any) {
      console.error("Delete ad error:", error);
      alert(error?.message || "Could not delete ad.");
    } finally {
      setDeleting(false);
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

              <h1 className="mt-2 text-4xl font-bold">Edit Ad</h1>

              <p className="mt-2 text-slate-500">
                {ad?.$id ? `Ad ID: ${ad.$id}` : "Loading ad..."}
              </p>
            </div>

            <CmsLogoutButton />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-8 py-10">
          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              Loading ad...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-6">
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
                    placeholder="Use external for a webpage"
                  />

                  <Field
                    label="Link URL / Internal ID"
                    value={form.linkId}
                    onChange={(value) => updateField("linkId", value)}
                    placeholder="Example: https://sponsorwebsite.com"
                  />

                  <div className="md:col-span-2 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
                    For webpage adverts, use <b>Link Type:</b> external and put the full website URL in <b>Link URL / Internal ID</b>.
                  </div>

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
                      label="Upload Replacement Image"
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

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                  className="rounded border border-red-200 bg-white px-7 py-4 text-lg font-bold text-red-600 disabled:opacity-60"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>

                <Link
                  href="/ads"
                  prefetch={false}
                  className="rounded border border-slate-200 bg-white px-7 py-4 text-lg font-bold text-[#29496d]"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Ad"}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </CmsAuthGuard>
  );
}
