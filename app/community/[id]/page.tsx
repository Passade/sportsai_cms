"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsImageUpload from "@/components/cms-image-upload";
import {
  CmsCommunityPostOption,
  CommunityPostKind,
  createCmsCommunityOption,
  deleteCmsCommunityOption,
  deleteCmsCommunityPost,
  getCmsCommunityOptionsForPost,
  getCmsCommunityPostById,
  normalizeCommunityPublishedAtForInput,
  updateCmsCommunityOption,
  updateCmsCommunityPost,
} from "@/lib/cms";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const initialForm = {
  kind: "poll" as CommunityPostKind,
  source: "",
  handle: "",
  title: "",
  question: "",
  tag: "",
  postImageUrl: "",
  fixtureId: "",
  teamId: "",
  streamId: "",
  sortOrder: "999",
  publishedAt: "",
  isActive: true,
};

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
        type={type}
        className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
      />
    </label>
  );
}

export default function EditCommunityPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [options, setOptions] = useState<CmsCommunityPostOption[]>([]);
  const [newOption, setNewOption] = useState({
    label: "",
    imageUrl: "",
    sortOrder: "999",
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const needsOptions = form.kind === "poll" || form.kind === "debate";

  async function loadData() {
    try {
      setLoading(true);
      const [post, optionList] = await Promise.all([
        getCmsCommunityPostById(params.id),
        getCmsCommunityOptionsForPost(params.id),
      ]);

      setForm({
        kind: (post.kind || "image") as CommunityPostKind,
        source: String(post.source || ""),
        handle: String(post.handle || ""),
        title: String(post.title || ""),
        question: String(post.question || ""),
        tag: String(post.tag || ""),
        postImageUrl: String(post.postImageUrl || ""),
        fixtureId: String(post.fixtureId || ""),
        teamId: String(post.teamId || ""),
        streamId: String(post.streamId || ""),
        sortOrder: String(post.sortOrder ?? 999),
        publishedAt: normalizeCommunityPublishedAtForInput(String(post.publishedAt || "")),
        isActive: Boolean(post.isActive),
      });

      setOptions(optionList);
    } catch (error: any) {
      console.error("Load community post error:", error);
      alert(error?.message || "Could not load community post.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [params.id]);

  function updateField(key: keyof typeof initialForm, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateOptionLocal(
    optionId: string,
    key: keyof CmsCommunityPostOption,
    value: string | boolean
  ) {
    setOptions((current) =>
      current.map((option) =>
        option.$id === optionId ? { ...option, [key]: value } : option
      )
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      await updateCmsCommunityPost(params.id, form);
      await loadData();
      alert("Community post saved.");
    } catch (error: any) {
      console.error("Update community post error:", error);
      alert(error?.message || "Could not update community post.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveOption(option: CmsCommunityPostOption) {
    await updateCmsCommunityOption(option.$id, {
      label: option.label || "",
      imageUrl: option.imageUrl || "",
      sortOrder: String(option.sortOrder ?? 999),
      isActive: Boolean(option.isActive),
    });
    await loadData();
  }

  async function handleAddOption() {
    if (!newOption.label.trim()) {
      alert("Option label is required.");
      return;
    }

    await createCmsCommunityOption(params.id, newOption);
    setNewOption({ label: "", imageUrl: "", sortOrder: "999", isActive: true });
    await loadData();
  }

  async function handleDeleteOption(optionId: string) {
    if (!window.confirm("Delete this option?")) return;
    await deleteCmsCommunityOption(optionId);
    await loadData();
  }

  async function handleDeletePost() {
    if (!window.confirm("Delete this community post and its options?")) return;
    await deleteCmsCommunityPost(params.id);
    router.push("/community");
  }

  if (loading) {
    return (
      <CmsAuthGuard>
        <main className="min-h-screen bg-[#f8fafc] px-8 py-10 text-[#29496d]">
          Loading community post...
        </main>
      </CmsAuthGuard>
    );
  }

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] text-[#29496d]">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-5 px-8 py-6">
            <div>
              <Link href="/community" className="text-sm font-bold uppercase tracking-[3px] text-cyan-600">
                ← Community
              </Link>
              <h1 className="mt-2 text-4xl font-bold">Edit Community Post</h1>
            </div>
            <button
              type="button"
              onClick={handleDeletePost}
              className="rounded border border-red-200 bg-white px-5 py-3 font-bold text-red-600 hover:bg-red-50"
            >
              Delete Post
            </button>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="mx-auto grid max-w-5xl gap-6 px-8 py-10">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#29496d]">Post Details</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold uppercase tracking-wide text-slate-400">Kind</span>
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
              <Field label="Post Image URL" value={form.postImageUrl} onChange={(value) => updateField("postImageUrl", value)} />
              <div className="md:col-span-2">
                <CmsImageUpload
                  label="Upload Post Image"
                  value={form.postImageUrl}
                  onUploaded={(url) => updateField("postImageUrl", url)}
                />
              </div>
              <Field label="Fixture ID" value={form.fixtureId} onChange={(value) => updateField("fixtureId", value)} />
              <Field label="Team ID" value={form.teamId} onChange={(value) => updateField("teamId", value)} />
              <Field label="Stream ID" value={form.streamId} onChange={(value) => updateField("streamId", value)} />
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

          <div className="flex justify-end gap-3">
            <Link href="/community" className="rounded border border-slate-200 bg-white px-7 py-4 text-lg font-bold text-[#29496d]">
              Back
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Post"}
            </button>
          </div>
        </form>

        {needsOptions ? (
          <section className="mx-auto grid max-w-5xl gap-6 px-8 pb-10">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-[#29496d]">Options</h2>

              <div className="mt-6 grid gap-5">
                {options.map((option) => (
                  <div key={option.$id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="grid gap-4 md:grid-cols-[1fr_1fr_120px_auto_auto] md:items-end">
                      <Field
                        label="Label"
                        value={option.label || ""}
                        onChange={(value) => updateOptionLocal(option.$id, "label", value)}
                      />
                      <Field
                        label="Image URL"
                        value={option.imageUrl || ""}
                        onChange={(value) => updateOptionLocal(option.$id, "imageUrl", value)}
                      />
                      <div className="md:col-span-5">
                        <CmsImageUpload
                          label="Upload Option Image"
                          value={option.imageUrl || ""}
                          onUploaded={(url) => updateOptionLocal(option.$id, "imageUrl", url)}
                        />
                      </div>
                      <Field
                        label="Order"
                        value={String(option.sortOrder ?? 999)}
                        onChange={(value) => updateOptionLocal(option.$id, "sortOrder", value)}
                        type="number"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveOption(option)}
                        className="rounded bg-cyan-500 px-4 py-3 font-bold text-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOption(option.$id)}
                        className="rounded border border-red-200 bg-white px-4 py-3 font-bold text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                    <label className="mt-4 flex items-center gap-3">
                      <input
                        checked={Boolean(option.isActive)}
                        onChange={(event) => updateOptionLocal(option.$id, "isActive", event.target.checked)}
                        type="checkbox"
                        className="h-5 w-5"
                      />
                      <span className="font-bold text-[#29496d]">Active option</span>
                      <span className="text-sm text-slate-400">Votes: {option.votesCount || 0}</span>
                    </label>
                  </div>
                ))}

                <div className="rounded-2xl border border-dashed border-slate-300 p-5">
                  <h3 className="text-lg font-bold text-[#29496d]">Add Option</h3>

                  <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_120px_auto] md:items-end">
                    <Field
                      label="Label"
                      value={newOption.label}
                      onChange={(value) => setNewOption((current) => ({ ...current, label: value }))}
                    />
                    <Field
                      label="Image URL"
                      value={newOption.imageUrl}
                      onChange={(value) => setNewOption((current) => ({ ...current, imageUrl: value }))}
                    />
                    <div className="md:col-span-4">
                      <CmsImageUpload
                        label="Upload New Option Image"
                        value={newOption.imageUrl}
                        onUploaded={(url) => setNewOption((current) => ({ ...current, imageUrl: url }))}
                      />
                    </div>
                    <Field
                      label="Order"
                      value={newOption.sortOrder}
                      onChange={(value) => setNewOption((current) => ({ ...current, sortOrder: value }))}
                      type="number"
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="rounded bg-green-600 px-4 py-3 font-bold text-white"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </CmsAuthGuard>
  );
}
