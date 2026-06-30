"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsImageUpload from "@/components/cms-image-upload";
import { CommunityPostKind, createCmsCommunityPost } from "@/lib/cms";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const initialForm = {
  kind: "poll" as CommunityPostKind,
  source: "SportsAI",
  handle: "@sportsai",
  title: "",
  question: "",
  tag: "Fan Poll",
  postImageUrl: "",
  sortOrder: "999",
  publishedAt: "",
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

function isValidHttpUrl(value: string) {
  if (!value.trim()) {
    return true;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function CreateCommunityPostPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [options, setOptions] = useState([
    { label: "", imageUrl: "", sortOrder: "1", isActive: true },
    { label: "", imageUrl: "", sortOrder: "2", isActive: true },
  ]);
  const [saving, setSaving] = useState(false);

  const needsOptions = form.kind === "poll" || form.kind === "debate";

  function updateField(key: keyof typeof initialForm, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateOption(index: number, key: string, value: string | boolean) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [key]: value } : option
      )
    );
  }

  function addOption() {
    setOptions((current) => [
      ...current,
      {
        label: "",
        imageUrl: "",
        sortOrder: String(current.length + 1),
        isActive: true,
      },
    ]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim() && !form.question.trim()) {
      alert("Add a title or question.");
      return;
    }

    if (!isValidHttpUrl(form.postImageUrl)) {
      alert("Post Image URL must be a valid http/https URL. Use the upload button or clear the field.");
      return;
    }

    const invalidOptionImage = options.find(
      (option) => option.imageUrl.trim() && !isValidHttpUrl(option.imageUrl)
    );

    if (invalidOptionImage) {
      alert("One of the option image URLs is invalid. Use the upload button or clear that field.");
      return;
    }

    if (needsOptions && options.filter((option) => option.label.trim()).length < 2) {
      alert("Polls and debates need at least 2 options.");
      return;
    }

    try {
      setSaving(true);
      await createCmsCommunityPost(form, options);
      router.push("/community");
    } catch (error: any) {
      console.error("Create community post error:", error);
      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not create community post."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] text-[#29496d]">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-8 py-6">
            <Link
              href="/community"
              prefetch={false}
              className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
            >
              ← Community
            </Link>
            <h1 className="mt-2 text-4xl font-bold">Create Community Post</h1>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="mx-auto grid max-w-5xl gap-6 px-8 py-10">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#29496d]">Post Details</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Kind
                </span>
                <select
                  value={form.kind}
                  onChange={(event) => updateField("kind", event.target.value as CommunityPostKind)}
                  className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                >
                  <option value="poll">Poll</option>
                  <option value="debate">Debate</option>
                  <option value="image">Image</option>
                  <option value="fixture">Fixture</option>
                </select>
              </label>

              <Field label="Tag" value={form.tag} onChange={(value) => updateField("tag", value)} />
              <Field label="Source" value={form.source} onChange={(value) => updateField("source", value)} />
              <Field label="Handle" value={form.handle} onChange={(value) => updateField("handle", value)} />
              <Field label="Title" value={form.title} onChange={(value) => updateField("title", value)} />
              <Field label="Question" value={form.question} onChange={(value) => updateField("question", value)} />
              <Field
                label="Post Image URL"
                value={form.postImageUrl}
                onChange={(value) => updateField("postImageUrl", value)}
                placeholder="This fills automatically after upload"
              />
              <div className="md:col-span-2">
                <CmsImageUpload
                  label="Upload Post Image"
                  value={form.postImageUrl}
                  onUploaded={(url) => updateField("postImageUrl", url)}
                />
              </div>
              <Field label="Sort Order" value={form.sortOrder} onChange={(value) => updateField("sortOrder", value)} type="number" />
              <Field label="Published At" value={form.publishedAt} onChange={(value) => updateField("publishedAt", value)} type="datetime-local" />
            </div>

            <label className="mt-6 flex items-center gap-3">
              <input
                checked={form.isActive}
                onChange={(event) => updateField("isActive", event.target.checked)}
                type="checkbox"
                className="h-5 w-5"
              />
              <span className="font-bold text-[#29496d]">Active post</span>
            </label>
          </div>

          {needsOptions ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-[#29496d]">Options</h2>
                <button type="button" onClick={addOption} className="rounded bg-cyan-500 px-5 py-3 font-bold text-white">
                  + Add Option
                </button>
              </div>

              <div className="mt-6 grid gap-5">
                {options.map((option, index) => (
                  <div key={index} className="rounded-2xl border border-slate-200 p-5">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field
                        label={`Option ${index + 1}`}
                        value={option.label}
                        onChange={(value) => updateOption(index, "label", value)}
                      />
                      <Field
                        label="Image URL"
                        value={option.imageUrl}
                        onChange={(value) => updateOption(index, "imageUrl", value)}
                        placeholder="This fills automatically after upload"
                      />
                      <div className="md:col-span-3">
                        <CmsImageUpload
                          label="Upload Option Image"
                          value={option.imageUrl}
                          onUploaded={(url) => updateOption(index, "imageUrl", url)}
                        />
                      </div>
                      <Field
                        label="Order"
                        value={option.sortOrder}
                        onChange={(value) => updateOption(index, "sortOrder", value)}
                        type="number"
                      />
                    </div>
                    <label className="mt-4 flex items-center gap-3">
                      <input
                        checked={option.isActive}
                        onChange={(event) => updateOption(index, "isActive", event.target.checked)}
                        type="checkbox"
                        className="h-5 w-5"
                      />
                      <span className="font-bold text-[#29496d]">Active option</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Link href="/community" prefetch={false} className="rounded border border-slate-200 bg-white px-7 py-4 text-lg font-bold text-[#29496d]">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create Post"}
            </button>
          </div>
        </form>
      </main>
    </CmsAuthGuard>
  );
}
