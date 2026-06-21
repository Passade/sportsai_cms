"use client";

import { uploadCmsMediaFile } from "@/lib/media";
import { useRef, useState } from "react";

export default function CmsImageUpload({
  label = "Upload image",
  value,
  onUploaded,
}: {
  label?: string;
  value?: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploading(true);

      const result = await uploadCmsMediaFile(file);

      onUploaded(result.url);
    } catch (error: any) {
      console.error("Image upload error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not upload image."
      );
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Upload an image to Appwrite Storage. The image URL fills the field automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded bg-cyan-500 px-5 py-3 font-bold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Choose Image"}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            Preview
          </p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Uploaded preview"
            className="h-40 w-full max-w-md rounded-2xl object-cover"
          />

          <p className="mt-2 break-all text-xs text-slate-400">{value}</p>
        </div>
      ) : null}
    </div>
  );
}
