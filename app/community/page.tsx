"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  getCmsErrorMessage,
  useCmsToast,
} from "@/components/cms-toast-provider";
import {
  CmsCommunityPost,
  deleteCmsCommunityPost,
  getCmsCommunityPosts,
} from "@/lib/cms";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function formatDate(value?: string) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

export default function CommunityPage() {
  const { showSuccess, showError, showWarning } = useCmsToast();

  const [posts, setPosts] = useState<CmsCommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  async function loadPosts() {
    try {
      setLoading(true);
      const data = await getCmsCommunityPosts();
      setPosts(data);
      setSelectedIds([]);
    } catch (error) {
      console.error("Community posts load error:", error);
      showError(
        "Could not load community posts",
        getCmsErrorMessage(error) || "Check your Appwrite setup."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return posts;

    return posts.filter((post) =>
      [
        post.kind,
        post.source,
        post.handle,
        post.title,
        post.question,
        post.tag,
        post.$id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [posts, search]);

  const filteredIds = filteredPosts.map((post) => post.$id);
  const selectedInFiltered = selectedIds.filter((id) =>
    filteredIds.includes(id)
  );

  const allFilteredSelected =
    filteredPosts.length > 0 &&
    filteredPosts.every((post) => selectedIds.includes(post.$id));

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedIds((current) =>
        current.filter((selectedId) => !filteredIds.includes(selectedId))
      );
      return;
    }

    setSelectedIds((current) =>
      Array.from(new Set([...current, ...filteredIds]))
    );
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) {
      showWarning(
        "No community posts selected",
        "Select at least one community post first."
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected community post${
        selectedIds.length === 1 ? "" : "s"
      }? This will also delete linked poll/debate options, votes and reactions where applicable. This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);

      await Promise.all(selectedIds.map((id) => deleteCmsCommunityPost(id)));

      setPosts((current) =>
        current.filter((post) => !selectedIds.includes(post.$id))
      );

      showSuccess(
        "Community posts deleted",
        `Deleted ${selectedIds.length} selected community post${
          selectedIds.length === 1 ? "" : "s"
        }.`
      );

      setSelectedIds([]);
    } catch (error) {
      console.error("Bulk delete community posts error:", error);
      showError("Could not delete community posts", getCmsErrorMessage(error));
    } finally {
      setDeleting(false);
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
                className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-4xl font-bold">Community</h1>

              <p className="mt-2 text-slate-500">
                Manage polls, image posts, fixture posts and debate posts.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/community/create"
                className="rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white transition hover:bg-cyan-600"
              >
                + Create Post
              </Link>

              <CmsLogoutButton />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <label className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Search community posts
            </label>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, question, source, tag, type or post ID..."
              className="mt-3 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
            />

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-3 font-bold text-[#29496d]">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    className="h-5 w-5"
                  />

                  Select all visible
                </label>

                <span className="text-sm font-semibold text-slate-500">
                  {selectedIds.length} selected
                  {selectedInFiltered.length !== selectedIds.length
                    ? ` · ${selectedInFiltered.length} visible`
                    : ""}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  disabled={selectedIds.length === 0 || deleting}
                  className="rounded border border-slate-200 bg-white px-4 py-3 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear Selection
                </button>

                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.length === 0 || deleting}
                  className="rounded bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete Selected"}
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              Loading community posts...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              No community posts found.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredPosts.map((post) => {
                const isSelected = selectedIds.includes(post.$id);

                return (
                  <article
                    key={post.$id}
                    className={`rounded-[28px] border bg-white p-6 shadow-sm transition ${
                      isSelected
                        ? "border-red-300 ring-2 ring-red-100"
                        : "border-slate-200 hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(post.$id)}
                          className="h-5 w-5"
                          aria-label={`Select ${
                            post.title || post.question || "community post"
                          }`}
                        />
                      </label>

                      <Link href={`/community/${post.$id}`} className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-700">
                            {post.kind || "post"}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                              post.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {post.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>

                        {post.postImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.postImageUrl}
                            alt={post.title || "Community post"}
                            className="mt-5 h-40 w-full rounded-2xl object-cover"
                          />
                        ) : null}

                        <h2 className="mt-5 line-clamp-2 text-2xl font-bold text-[#29496d]">
                          {post.title || post.question || "Untitled post"}
                        </h2>

                        <p className="mt-3 line-clamp-3 text-slate-500">
                          {post.question || "No question"}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            {post.tag || "No tag"}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            Votes {post.votesCount || 0}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            Reactions {post.reactionsCount || 0}
                          </span>
                        </div>

                        <p className="mt-4 text-sm text-slate-400">
                          {formatDate(post.publishedAt)}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          ID: {post.$id}
                        </p>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </CmsAuthGuard>
  );
}
