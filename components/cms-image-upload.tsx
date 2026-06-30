"use client";

import { uploadCmsMediaFile } from "@/lib/media";
import { useMemo, useRef, useState } from "react";

type ImageUploadPreset = {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  targetMaxBytes: number;
  outputType: "image/webp" | "image/jpeg";
  label: string;
};

const ONE_MB = 1024 * 1024;

function isValidHttpUrl(value?: string) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatBytes(value: number) {
  if (!value) return "0 B";

  const units = ["B", "KB", "MB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getPresetFromLabel(label: string): ImageUploadPreset {
  const cleanLabel = label.toLowerCase();

  if (cleanLabel.includes("logo") || cleanLabel.includes("team")) {
    return {
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.82,
      targetMaxBytes: 180 * 1024,
      outputType: "image/webp",
      label: "Logo 512x512",
    };
  }

  if (cleanLabel.includes("player") || cleanLabel.includes("profile")) {
    return {
      maxWidth: 600,
      maxHeight: 600,
      quality: 0.82,
      targetMaxBytes: 250 * 1024,
      outputType: "image/webp",
      label: "Player 600x600",
    };
  }

  if (cleanLabel.includes("ad") || cleanLabel.includes("banner")) {
    return {
      maxWidth: 1600,
      maxHeight: 500,
      quality: 0.78,
      targetMaxBytes: 400 * 1024,
      outputType: "image/webp",
      label: "Ad banner 1600x500",
    };
  }

  if (
    cleanLabel.includes("post") ||
    cleanLabel.includes("community") ||
    cleanLabel.includes("option") ||
    cleanLabel.includes("thumbnail") ||
    cleanLabel.includes("media")
  ) {
    return {
      maxWidth: 1200,
      maxHeight: 675,
      quality: 0.78,
      targetMaxBytes: 500 * 1024,
      outputType: "image/webp",
      label: "Post 1200x675",
    };
  }

  return {
    maxWidth: 1200,
    maxHeight: 675,
    quality: 0.78,
    targetMaxBytes: 500 * 1024,
    outputType: "image/webp",
    label: "Default 1200x675",
  };
}

function getFileExtension(outputType: ImageUploadPreset["outputType"]) {
  if (outputType === "image/jpeg") return "jpg";
  return "webp";
}

function getCompressedFileName(originalName: string, outputType: ImageUploadPreset["outputType"]) {
  const withoutExtension = originalName.replace(/\.[^/.]+$/, "") || "image";
  const extension = getFileExtension(outputType);
  return `${withoutExtension}-compressed.${extension}`;
}

function loadImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read selected image."));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not compress image."));
          return;
        }

        resolve(blob);
      },
      type,
      quality
    );
  });
}

async function compressImageFile(file: File, preset: ImageUploadPreset) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  // Keep animated GIFs untouched. Canvas compression would destroy animation.
  if (file.type === "image/gif") {
    return {
      file,
      originalBytes: file.size,
      compressedBytes: file.size,
      width: 0,
      height: 0,
      skipped: true,
    };
  }

  const image = await loadImageElement(file);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;

  const ratio = Math.min(
    1,
    preset.maxWidth / originalWidth,
    preset.maxHeight / originalHeight
  );

  const outputWidth = Math.max(1, Math.round(originalWidth * ratio));
  const outputHeight = Math.max(1, Math.round(originalHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare image compression.");
  }

  context.drawImage(image, 0, 0, outputWidth, outputHeight);

  let quality = preset.quality;
  let blob = await canvasToBlob(canvas, preset.outputType, quality);

  while (blob.size > preset.targetMaxBytes && quality > 0.52) {
    quality = Math.max(0.52, quality - 0.08);
    blob = await canvasToBlob(canvas, preset.outputType, quality);
  }

  // If conversion somehow makes a tiny image larger, keep the original.
  if (blob.size > file.size && file.size <= preset.targetMaxBytes && ratio === 1) {
    return {
      file,
      originalBytes: file.size,
      compressedBytes: file.size,
      width: originalWidth,
      height: originalHeight,
      skipped: true,
    };
  }

  const compressedFile = new File(
    [blob],
    getCompressedFileName(file.name, preset.outputType),
    {
      type: preset.outputType,
      lastModified: Date.now(),
    }
  );

  return {
    file: compressedFile,
    originalBytes: file.size,
    compressedBytes: compressedFile.size,
    width: outputWidth,
    height: outputHeight,
    skipped: false,
  };
}

function extractUploadUrl(result: any) {
  if (typeof result === "string") {
    return result;
  }

  if (result?.url && typeof result.url === "string") {
    return result.url;
  }

  if (result?.href && typeof result.href === "string") {
    return result.href;
  }

  return "";
}

export default function CmsImageUpload({
  label = "Upload image",
  value,
  onUploaded,
  maxWidth,
  maxHeight,
  quality,
  targetMaxBytes,
}: {
  label?: string;
  value?: string;
  onUploaded: (url: string) => void;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetMaxBytes?: number;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState("");

  const preset = useMemo(() => {
    const inferred = getPresetFromLabel(label);

    return {
      ...inferred,
      maxWidth: maxWidth || inferred.maxWidth,
      maxHeight: maxHeight || inferred.maxHeight,
      quality: quality || inferred.quality,
      targetMaxBytes: targetMaxBytes || inferred.targetMaxBytes,
    };
  }, [label, maxWidth, maxHeight, quality, targetMaxBytes]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploading(true);
      setCompressionInfo("Compressing image...");

      const compressed = await compressImageFile(file, preset);

      setCompressionInfo(
        compressed.skipped
          ? `Using original: ${formatBytes(compressed.originalBytes)}`
          : `Compressed ${formatBytes(compressed.originalBytes)} → ${formatBytes(
              compressed.compressedBytes
            )} (${compressed.width}x${compressed.height})`
      );

      const result = await uploadCmsMediaFile(compressed.file);
      const uploadedUrl = extractUploadUrl(result);

      if (!isValidHttpUrl(uploadedUrl)) {
        console.error("Invalid upload result:", result);
        throw new Error("Upload did not return a valid Appwrite image URL.");
      }

      onUploaded(uploadedUrl);
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
            Uploads are compressed before Appwrite Storage. Preset: {preset.label}.
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Target max size: about {formatBytes(preset.targetMaxBytes)}.
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

      {compressionInfo ? (
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500">
          {compressionInfo}
        </p>
      ) : null}

      {value ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            Preview
          </p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Uploaded preview"
            loading="lazy"
            className="h-40 w-full max-w-md rounded-2xl object-cover"
          />

          <p className="mt-2 break-all text-xs text-slate-400">{value}</p>
        </div>
      ) : null}
    </div>
  );
}
