"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsImageUpload from "@/components/cms-image-upload";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  CmsMediaFile,
  deleteCmsMediaFile,
  listCmsMediaFiles,
} from "@/lib/media";
import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function MediaPage() {
  const [files, setFiles] = useState<CmsMediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadedUrl, setUploadedUrl] = useState("");

  async function loadFiles() {
    try {
      setLoading(true);
      const data = await listCmsMediaFiles();
      setFiles(data);
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
    loadFiles();
  }, []);

  async function handleDelete(fileId: string) {
    if (!window.confirm("Delete this media file?")) {
      return;
    }

    try {
      await deleteCmsMediaFile(fileId);
      await loadFiles();
    } catch (error: any) {
      console.error("Delete media error:", error);
      alert(error?.message || "Could not delete media file.");
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
                className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-4xl font-bold">Media Library</h1>

              <p className="mt-2 text-slate-500">
                Upload and manage CMS images stored in Appwrite Storage.
              </p>
            </div>

            <CmsLogoutButton />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#29496d]">Upload Image</h2>

            <div className="mt-5">
              <CmsImageUpload
                label="Media upload"
                value={uploadedUrl}
                onUploaded={(url) => {
                  setUploadedUrl(url);
                  loadFiles();
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
                      src={file.url}
                      alt={file.name}
                      className="h-44 w-full rounded-2xl object-cover"
                    />

                    <h2 className="mt-4 truncate text-lg font-bold text-[#29496d]">
                      {file.name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                      {file.mimeType} · {formatBytes(file.sizeOriginal)}
                    </p>

                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(file.url)}
                        className="rounded bg-cyan-500 px-4 py-3 font-bold text-white transition hover:bg-cyan-600"
                      >
                        Copy URL
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(file.$id)}
                        className="rounded border border-red-200 bg-white px-4 py-3 font-bold text-red-600 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </CmsAuthGuard>
  );
}
