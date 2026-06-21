"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import { CmsCommunityPost, getCmsCommunityPosts } from "@/lib/cms";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function formatDate(value?: string) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<CmsCommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadPosts() {
    try {
      setLoading(true);
      setPosts(await getCmsCommunityPosts());
    } catch (error: any) {
      console.error("Community posts load error:", error);
      alert(error?.message || "Could not load community posts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
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
        post.fixtureId,
        post.teamId,
        post.streamId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [posts, search]);

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] text-[#29496d]">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-8 py-6">
            <div>
              <Link href="/" className="text-sm font-bold uppercase tracking-[3px] text-cyan-600">
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
              placeholder="Search by title, question, source, tag, type or linked ID..."
              className="mt-3 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
            />
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
              {filteredPosts.map((post) => (
                <Link
                  key={post.$id}
                  href={`/community/${post.$id}`}
                  className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-lg"
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-700">
                      {post.kind || "post"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                        post.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
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
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </CmsAuthGuard>
  );
}
