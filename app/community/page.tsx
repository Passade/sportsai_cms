"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  getCmsErrorMessage,
  useCmsToast,
} from "@/components/cms-toast-provider";
import {
  CmsCommunityPost,
  CommunityPostKind,
  deleteCmsCommunityPost,
  getCmsCommunityPostsPage,
} from "@/lib/cms";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 25;

type CommunityKindFilter = CommunityPostKind | "all";
type CommunityActiveFilter = "all" | "active" | "inactive";

function formatDate(value?: string) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function getPostTitle(post: CmsCommunityPost) {
  return post.title || post.question || "Untitled post";
}

export default function CommunityPage() {
  const { showSuccess, showError, showWarning } = useCmsToast();

  const [posts, setPosts] = useState<CmsCommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const [kindFilter, setKindFilter] = useState<CommunityKindFilter>("all");
  const [activeFilter, setActiveFilter] = useState<CommunityActiveFilter>("all");

  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previousCursor, setPreviousCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [pageNumber, setPageNumber] = useState(1);

  async function loadPosts(options?: {
    cursor?: string;
    direction?: "next" | "previous";
    reset?: boolean;
  }) {
    try {
      setLoading(true);

      const data = await getCmsCommunityPostsPage({
        cursor: options?.cursor,
        direction: options?.direction,
        kind: kindFilter,
        active: activeFilter,
        search: "",
        limit: PAGE_SIZE,
      });

      setPosts(data.documents);
      setTotal(data.total);
      setNextCursor(data.nextCursor);
      setPreviousCursor(data.previousCursor);
      setSelectedIds([]);

      if (options?.reset) {
        setCursorHistory([]);
        setPageNumber(1);
      }
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
    loadPosts({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindFilter, activeFilter]);

  const visiblePosts = useMemo(() => posts, [posts]);

  const visibleIds = visiblePosts.map((post) => post.$id);
  const selectedInVisible = selectedIds.filter((id) => visibleIds.includes(id));

  const allVisibleSelected =
    visiblePosts.length > 0 &&
    visiblePosts.every((post) => selectedIds.includes(post.$id));

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((selectedId) => !visibleIds.includes(selectedId))
      );
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
  }

  async function refreshPosts() {
    await loadPosts({ reset: true });
  }

  async function goToNextPage() {
    if (!nextCursor || loading) return;

    const currentFirstCursor = previousCursor;

    await loadPosts({
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
      await loadPosts({ reset: true });
      return;
    }

    await loadPosts({
      cursor,
      direction: "previous",
    });

    setCursorHistory(history);
    setPageNumber((current) => Math.max(1, current - 1));
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
      setTotal((current) => Math.max(0, current - selectedIds.length));

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
                prefetch={false}
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
              <button
                type="button"
                onClick={refreshPosts}
                disabled={loading}
                className="rounded border border-slate-200 bg-white px-5 py-4 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>

              <Link
                href="/community/create"
                prefetch={false}
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
            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Type
                </span>

                <select
                  value={kindFilter}
                  onChange={(event) =>
                    setKindFilter(event.target.value as CommunityKindFilter)
                  }
                  className="mt-3 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                >
                  <option value="all">All post types</option>
                  <option value="poll">Polls</option>
                  <option value="image">Images</option>
                  <option value="fixture">Fixtures</option>
                  <option value="debate">Debates</option>
                </select>
              </label>

              <label>
                <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                  Status
                </span>

                <select
                  value={activeFilter}
                  onChange={(event) =>
                    setActiveFilter(event.target.value as CommunityActiveFilter)
                  }
                  className="mt-3 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Inactive only</option>
                </select>
              </label>
            </div>

            

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-3 font-bold text-[#29496d]">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="h-5 w-5"
                  />

                  Select all visible
                </label>

                <span className="text-sm font-semibold text-slate-500">
                  {selectedIds.length} selected
                  {selectedInVisible.length !== selectedIds.length
                    ? ` · ${selectedInVisible.length} visible`
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
          ) : visiblePosts.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              No community posts found.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visiblePosts.map((post) => {
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
                          aria-label={`Select ${getPostTitle(post)}`}
                        />
                      </label>

                      <Link
                        href={`/community/${post.$id}`}
                        prefetch={false}
                        className="min-w-0 flex-1"
                      >
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
                            loading="lazy"
                            className="mt-5 h-40 w-full rounded-2xl object-cover"
                          />
                        ) : null}

                        <h2 className="mt-5 line-clamp-2 text-2xl font-bold text-[#29496d]">
                          {getPostTitle(post)}
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

          <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-base font-bold text-[#29496d]">
                Page {pageNumber}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Showing up to {PAGE_SIZE} community posts from {total} matching
                records.
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
                disabled={loading || !nextCursor || posts.length < PAGE_SIZE}
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
