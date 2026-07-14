import { Client, ID, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 20_000;
const TARGET_BYTES = 12 * 1024;
const ACCEPTABLE_BYTES = 20 * 1024;

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function sanitizeFilename(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

async function compressPoster(
  source: Buffer,
  orientation: "horizontal" | "vertical"
) {
  const horizontalSizes = [
    { width: 1108, height: 623 },
    { width: 960, height: 540 },
    { width: 800, height: 450 },
    { width: 640, height: 360 },
  ];

  const verticalSizes = [
    { width: 500, height: 1600 },
    { width: 450, height: 1440 },
    { width: 400, height: 1280 },
    { width: 350, height: 1120 },
  ];

  const sizes = orientation === "vertical" ? verticalSizes : horizontalSizes;
  const qualities = [70, 60, 50, 42, 36, 30, 24];

  let smallest: Buffer | null = null;
  let selectedWidth = sizes[0].width;
  let selectedHeight = sizes[0].height;
  let selectedQuality = qualities[0];

  for (const size of sizes) {
    for (const quality of qualities) {
      const output = await sharp(source, { failOn: "none" })
        .rotate()
        .resize({
          width: size.width,
          height: size.height,
          fit: "contain",
          position: "centre",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
          withoutEnlargement: false,
        })
        .webp({
          quality,
          effort: 6,
          smartSubsample: true,
          alphaQuality: 80,
        })
        .toBuffer();

      if (!smallest || output.length < smallest.length) {
        smallest = output;
        selectedWidth = size.width;
        selectedHeight = size.height;
        selectedQuality = quality;
      }

      if (output.length <= TARGET_BYTES) {
        return {
          buffer: output,
          width: size.width,
          height: size.height,
          quality,
          reachedTarget: true,
        };
      }

      if (output.length <= ACCEPTABLE_BYTES && quality <= 42) {
        return {
          buffer: output,
          width: size.width,
          height: size.height,
          quality,
          reachedTarget: false,
        };
      }
    }
  }

  if (!smallest) {
    throw new Error("Could not compress the poster.");
  }

  return {
    buffer: smallest,
    width: selectedWidth,
    height: selectedHeight,
    quality: selectedQuality,
    reachedTarget: smallest.length <= TARGET_BYTES,
  };
}

function buildPublicViewUrl(params: {
  endpoint: string;
  projectId: string;
  bucketId: string;
  fileId: string;
}) {
  const endpoint = params.endpoint.replace(/\/+$/, "");

  return `${endpoint}/storage/buckets/${encodeURIComponent(
    params.bucketId
  )}/files/${encodeURIComponent(params.fileId)}/view?project=${encodeURIComponent(
    params.projectId
  )}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageUrl = String(body?.imageUrl || "").trim();
    const filenameHint = sanitizeFilename(
      String(body?.filenameHint || "fms-poster")
    );
    const orientation: "horizontal" | "vertical" =
      body?.orientation === "vertical" ? "vertical" : "horizontal";

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required." },
        { status: 400 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: "The supplied image URL is invalid." },
        { status: 400 }
      );
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Only HTTP and HTTPS image URLs are supported." },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    let sourceResponse: Response;

    try {
      sourceResponse = await fetch(imageUrl, {
        cache: "no-store",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*",
          "User-Agent": "SportsAI-CMS-Thumbnail-Importer/1.0",
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!sourceResponse.ok) {
      return NextResponse.json(
        { error: `Could not download source image. HTTP ${sourceResponse.status}.` },
        { status: 502 }
      );
    }

    const contentType = sourceResponse.headers.get("content-type") || "";

    if (!contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json(
        { error: `The source URL did not return an image. Received ${contentType || "unknown content type"}.` },
        { status: 415 }
      );
    }

    const sourceBuffer = Buffer.from(await sourceResponse.arrayBuffer());

    if (!sourceBuffer.length) {
      return NextResponse.json(
        { error: "The downloaded image was empty." },
        { status: 502 }
      );
    }

    if (sourceBuffer.length > MAX_SOURCE_BYTES) {
      return NextResponse.json(
        { error: "The source image is larger than 10 MB." },
        { status: 413 }
      );
    }

    const compressed = await compressPoster(sourceBuffer, orientation);

    const endpoint = requiredEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
    const projectId = requiredEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
    const bucketId = requiredEnv("NEXT_PUBLIC_APPWRITE_MEDIA_BUCKET_ID");
    const apiKey =
      process.env.APPWRITE_STORAGE_API_KEY ||
      requiredEnv("APPWRITE_API_KEY");

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const storage = new Storage(client);
    const filename = `${filenameHint || `fms-${orientation}`}.webp`;

    const file = await storage.createFile({
      bucketId,
      fileId: ID.unique(),
      file: InputFile.fromBuffer(compressed.buffer, filename),
    });

    const publicUrl = buildPublicViewUrl({
      endpoint,
      projectId,
      bucketId,
      fileId: file.$id,
    });

    return NextResponse.json({
      success: true,
      fileId: file.$id,
      publicUrl,
      originalBytes: sourceBuffer.length,
      compressedBytes: compressed.buffer.length,
      compressedKilobytes: Number((compressed.buffer.length / 1024).toFixed(1)),
      outputFormat: "webp",
      width: compressed.width,
      height: compressed.height,
      quality: compressed.quality,
      reachedTarget: compressed.reachedTarget,
      orientation,
    });
  } catch (error) {
    console.error("FMS poster import failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not copy the poster into Appwrite Storage.",
      },
      { status: 500 }
    );
  }
}