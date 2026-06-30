"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsImageUpload from "@/components/cms-image-upload";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  CmsMediaFile,
  deleteCmsMediaFile,
  listCmsMediaFilesPage,
} from "@/lib/media";
import Link from "next/link";
import { useEffect, useState } from "react";

const PAGE_SIZE = 25;

function formatBytes(value: number) {
  if (!value) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size = size / 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value?: string) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString();
}

export default function MediaPage() {
  const [files, setFiles] = useState<CmsMediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previousCursor, setPreviousCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [pageNumber, setPageNumber] = useState(1);

  async function loadFiles(options?: {
    cursor?: string;
    direction?: "next" | "previous";
    reset?: boolean;
  }) {
    try {
      setLoading(true);

      const data = await listCmsMediaFilesPage({
        cursor: options?.cursor,
        direction: options?.direction,
        limit: PAGE_SIZE,
      });

      setFiles(data.documents);
      setTotal(data.total);
      setNextCursor(data.nextCursor);
      setPreviousCursor(data.previousCursor);

      if (options?.reset) {
        setCursorHistory([]);
        setPageNumber(1);
      }
    } catch (error: any) {
      console.error("Media load error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not load media files."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles({
      reset: true,
    });
  }, []);

  async function refreshFiles() {
    await loadFiles({
      reset: true,
    });
  }

  async function goToNextPage() {
    if (!nextCursor || loading) return;

    const currentFirstCursor = previousCursor;

    await loadFiles({
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
      await loadFiles({
        reset: true,
      });
      return;
    }

    await loadFiles({
      cursor,
      direction: "previous",
    });

    setCursorHistory(history);
    setPageNumber((current) => Math.max(1, current - 1));
  }

  async function handleDelete(fileId: string) {
    if (!window.confirm("Delete this media file?")) {
      return;
    }

    try {
      setDeletingId(fileId);

      await deleteCmsMediaFile(fileId);

      setFiles((current) => current.filter((file) => file.$id !== fileId));
      setTotal((current) => Math.max(0, current - 1));
    } catch (error: any) {
      console.error("Delete media error:", error);
      alert(error?.message || "Could not delete media file.");
    } finally {
      setDeletingId("");
    }
  }

  async function copyToClipboard(url: string) {
    await navigator.clipboard.writeText(url);
    alert("Image URL copied.");
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

              <h1 className="mt-2 text-4xl font-bold">Media Library</h1>

              <p className="mt-2 text-slate-500">
                Upload and manage CMS images stored in Appwrite Storage.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={refreshFiles}
                disabled={loading}
                className="rounded border border-slate-200 bg-white px-5 py-4 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>

              <CmsLogoutButton />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#29496d]">Upload Image</h2>

            <p className="mt-2 text-slate-500">
              After upload, the first page refreshes once so the new media item
              appears.
            </p>

            <div className="mt-5">
              <CmsImageUpload
                label="Media upload"
                value={uploadedUrl}
                onUploaded={(url) => {
                  setUploadedUrl(url);
                  loadFiles({
                    reset: true,
                  });
                }}
              />
            </div>
          </div>

          <div className="mt-8">
            {loading ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
                Loading media...
              </div>
            ) : files.length === 0 ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
                No media files yet.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {files.map((file) => (
                  <div
                    key={file.$id}
                    className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.previewUrl || file.url}
                      alt={file.name}
                      loading="lazy"
                      className="h-44 w-full rounded-2xl object-cover"
                    />

                    <h2 className="mt-4 truncate text-lg font-bold text-[#29496d]">
                      {file.name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      {file.mimeType} · {formatBytes(file.sizeOriginal)}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Uploaded {formatDate(file.$createdAt)}
                    </p>

                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(file.url)}
                        className="rounded bg-cyan-500 px-4 py-3 font-bold text-white transition hover:bg-cyan-600"
                      >
                        Copy URL
                      </button>

                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-slate-200 bg-white px-4 py-3 text-center font-bold text-[#29496d] transition hover:bg-slate-50"
                      >
                        Open Full Image
                      </a>

                      <button
                        type="button"
                        disabled={deletingId === file.$id}
                        onClick={() => handleDelete(file.$id)}
                        className="rounded border border-red-200 bg-white px-4 py-3 font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === file.$id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-base font-bold text-[#29496d]">
                Page {pageNumber}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Showing up to {PAGE_SIZE} media files from {total} total files.
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
                disabled={loading || !nextCursor || files.length < PAGE_SIZE}
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