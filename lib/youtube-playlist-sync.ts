import { createHash } from "node:crypto";
import { Client, Databases, Query } from "node-appwrite";

type YouTubeThumbnail = {
  url?: string;
  width?: number;
  height?: number;
};

type YouTubePlaylistItem = {
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    position?: number;
    resourceId?: {
      videoId?: string;
    };
    thumbnails?: {
      maxres?: YouTubeThumbnail;
      standard?: YouTubeThumbnail;
      high?: YouTubeThumbnail;
      medium?: YouTubeThumbnail;
      default?: YouTubeThumbnail;
    };
  };
  contentDetails?: {
    videoId?: string;
  };
  status?: {
    privacyStatus?: string;
  };
};

type YouTubePlaylistResponse = {
  nextPageToken?: string;
  items?: YouTubePlaylistItem[];
  error?: {
    message?: string;
  };
};

export type StarterPlanCard = {
  $id: string;
  name?: string;
  title?: string;
  category?: string;
  sport?: string;
  matchKeyword?: string;
  active?: boolean;
  youtubePlaylistUrl?: string;
  youtubeAutoSync?: boolean;
};

export type YouTubeSyncContext = {
  databases: Databases;
  databaseId: string;
  streamsCollectionId: string;
  cardsCollectionId: string;
  youtubeApiKey: string;
};

export type YouTubeSyncResult = {
  cardId: string;
  cardTitle: string;
  matchKeyword: string;
  playlistId: string;
  totalPlaylistItems: number;
  availablePlaylistItems: number;
  newVideosFound: number;
  processedNewVideos: number;
  imported: number;
  skipped: number;
  unavailable: number;
  remainingToImport: number;
  importLimit: number;
  existingVodsRead: number;
  existingReadPages: number;
  message: string;
};

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function getYouTubeSyncContext(): YouTubeSyncContext {
  const endpoint = requiredEnv("APPWRITE_ENDPOINT");
  const projectId = requiredEnv("APPWRITE_PROJECT_ID");
  const apiKey = requiredEnv("APPWRITE_API_KEY");
  const databaseId = requiredEnv("APPWRITE_DATABASE_ID");
  const streamsCollectionId = requiredEnv("APPWRITE_STREAMS_COLLECTION_ID");
  const cardsCollectionId = requiredEnv(
    "APPWRITE_SPORT_TIER_CARDS_COLLECTION_ID",
  );
  const youtubeApiKey = requiredEnv("YOUTUBE_API_KEY");

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return {
    databases: new Databases(client),
    databaseId,
    streamsCollectionId,
    cardsCollectionId,
    youtubeApiKey,
  };
}

export function extractPlaylistId(value: string) {
  const clean = String(value || "").trim();

  if (!clean) return "";

  try {
    const parsed = new URL(clean);
    return parsed.searchParams.get("list") || "";
  } catch {
    return /^[A-Za-z0-9_-]+$/.test(clean) ? clean : "";
  }
}

function extractYouTubeVideoId(value?: string) {
  const clean = String(value || "").trim();

  if (!clean) return "";

  try {
    const parsed = new URL(clean);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtube-nocookie.com" ||
      host.endsWith(".youtube-nocookie.com")
    ) {
      const watchId = parsed.searchParams.get("v");
      if (watchId) return watchId;

      const parts = parsed.pathname.split("/").filter(Boolean);

      if (
        parts[0] === "shorts" ||
        parts[0] === "embed" ||
        parts[0] === "live"
      ) {
        return parts[1] || "";
      }
    }
  } catch {
    // Fall through to plain-ID validation.
  }

  return /^[A-Za-z0-9_-]{6,}$/.test(clean) ? clean : "";
}

export function normalizeCategory(value?: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isStarterPlanCategory(value?: string) {
  const category = normalizeCategory(value);

  return (
    category === "starter" ||
    category === "starter plan" ||
    category === "starter sport" ||
    category === "starter sports"
  );
}

function normalizeSportForStreams(value?: string) {
  const rawSport = String(value || "Sports").trim();
  const normalized = rawSport.toLowerCase();

  if (
    normalized === "f1" ||
    normalized === "formula 1" ||
    normalized === "formula one"
  ) {
    return "Motorsport";
  }

  return rawSport;
}

function selectThumbnail(item: YouTubePlaylistItem) {
  const thumbnails = item.snippet?.thumbnails;

  return (
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    ""
  );
}

function buildSearchText(values: Array<string | undefined>) {
  return values
    .filter(Boolean)
    .map((value) => String(value))
    .join(" ")
    .toLowerCase();
}

function getPlaylistVideoId(item: YouTubePlaylistItem) {
  return (
    item.contentDetails?.videoId ||
    item.snippet?.resourceId?.videoId ||
    ""
  ).trim();
}

function isUnavailablePlaylistItem(item: YouTubePlaylistItem) {
  const videoId = getPlaylistVideoId(item);
  const title = String(item.snippet?.title || "").trim();
  const privacyStatus = String(item.status?.privacyStatus || "").toLowerCase();

  return (
    !videoId ||
    !title ||
    title === "Deleted video" ||
    title === "Private video" ||
    privacyStatus === "private"
  );
}

function getStableYouTubeDocumentId(cardId: string, videoId: string) {
  const hash = createHash("sha256")
    .update(`${cardId}:${videoId}`)
    .digest("hex")
    .slice(0, 28);

  return `yt_${hash}`;
}

function isConflictError(error: unknown) {
  return Number((error as { code?: number } | null)?.code || 0) === 409;
}

function getItemSortTime(item: YouTubePlaylistItem) {
  const value = Date.parse(String(item.snippet?.publishedAt || ""));
  return Number.isNaN(value) ? 0 : value;
}

async function fetchPlaylistItems(params: {
  playlistId: string;
  apiKey: string;
}) {
  const allItems: YouTubePlaylistItem[] = [];
  let pageToken = "";

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");

    url.searchParams.set("part", "snippet,contentDetails,status");
    url.searchParams.set("playlistId", params.playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", params.apiKey);

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json()) as YouTubePlaylistResponse;

    if (!response.ok) {
      throw new Error(
        payload.error?.message || "YouTube playlist request failed.",
      );
    }

    allItems.push(...(payload.items || []));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return allItems;
}

async function getExistingYouTubeVideoIds(params: {
  context: YouTubeSyncContext;
  matchKeyword: string;
}) {
  const videoIds = new Set<string>();
  const limit = 100;
  let offset = 0;
  let pagesRead = 0;
  let documentsRead = 0;

  while (true) {
    const result = await params.context.databases.listDocuments(
      params.context.databaseId,
      params.context.streamsCollectionId,
      [
        Query.equal("competition", params.matchKeyword),
        Query.equal("status", "vod"),
        Query.equal("vodType", "youtube"),
        Query.limit(limit),
        Query.offset(offset),
      ],
    );

    pagesRead += 1;
    documentsRead += result.documents.length;

    for (const document of result.documents) {
      const videoId = extractYouTubeVideoId(String(document.vodUrl || ""));

      if (videoId) {
        videoIds.add(videoId);
      }
    }

    offset += result.documents.length;

    if (
      result.documents.length === 0 ||
      result.documents.length < limit ||
      offset >= result.total
    ) {
      break;
    }
  }

  return {
    videoIds,
    pagesRead,
    documentsRead,
  };
}

export async function syncStarterPlanPlaylist(params: {
  context: YouTubeSyncContext;
  card: StarterPlanCard;
  playlistUrl: string;
  maxImports?: number;
}): Promise<YouTubeSyncResult> {
  const { context, card } = params;
  const playlistId = extractPlaylistId(params.playlistUrl);
  const importLimit = Math.max(0, Math.min(50, Math.floor(params.maxImports ?? 10)));

  if (!playlistId) {
    throw new Error("Enter a valid YouTube playlist URL.");
  }

  if (!isStarterPlanCategory(card.category)) {
    throw new Error("The selected card is not in the Starter Plan category.");
  }

  const cardTitle = String(card.name || card.title || "Starter Plan").trim();
  const matchKeyword = String(card.matchKeyword || cardTitle).trim();

  if (!matchKeyword) {
    throw new Error("The selected card needs a matchKeyword or title.");
  }

  const sport = normalizeSportForStreams(card.sport);

  // These are YouTube API reads, not Appwrite reads.
  const playlistItems = await fetchPlaylistItems({
    playlistId,
    apiKey: context.youtubeApiKey,
  });

  // Appwrite is read in pages of 100, once per sync, so we do not issue one
  // Appwrite lookup for every YouTube item.
  const existing = await getExistingYouTubeVideoIds({
    context,
    matchKeyword,
  });

  const availableItems = playlistItems.filter(
    (item) => !isUnavailablePlaylistItem(item),
  );
  const unavailable = playlistItems.length - availableItems.length;

  const missingItems = availableItems
    .filter((item) => !existing.videoIds.has(getPlaylistVideoId(item)))
    .sort((a, b) => {
      const timeDifference = getItemSortTime(b) - getItemSortTime(a);

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return Number(b.snippet?.position ?? 0) - Number(a.snippet?.position ?? 0);
    });

  const batch = importLimit > 0 ? missingItems.slice(0, importLimit) : [];
  const alreadyExisting = availableItems.length - missingItems.length;

  let imported = 0;
  let concurrentSkipped = 0;

  for (const item of batch) {
    const videoId = getPlaylistVideoId(item);
    const title = String(item.snippet?.title || "").trim();
    const vodUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const thumbnail = selectThumbnail(item);
    const description = String(item.snippet?.description || "").trim();
    const publishedAt = item.snippet?.publishedAt || new Date().toISOString();

    const documentData = {
      title,
      status: "vod",
      competition: matchKeyword,
      sport,
      thumbnail,
      vodUrl,
      vodType: "youtube",
      description,
      matchDate: publishedAt,
      isFeatured: false,
      searchText: buildSearchText([
        title,
        description,
        matchKeyword,
        sport,
        cardTitle,
        "youtube",
        "starter plan",
      ]),
    };

    const documentId = getStableYouTubeDocumentId(card.$id, videoId);

    try {
      await context.databases.createDocument(
        context.databaseId,
        context.streamsCollectionId,
        documentId,
        documentData,
      );

      existing.videoIds.add(videoId);
      imported += 1;
    } catch (error) {
      // If two manual/cron runs overlap, both use the same deterministic ID.
      // One succeeds and the other gets 409 instead of creating a duplicate.
      if (isConflictError(error)) {
        existing.videoIds.add(videoId);
        concurrentSkipped += 1;
        continue;
      }

      console.error(`Failed to import YouTube video ${videoId}:`, error);
      throw error;
    }
  }

  const remainingToImport = Math.max(0, missingItems.length - batch.length);
  const skipped = alreadyExisting + concurrentSkipped;

  let message = "No new videos were found.";

  if (imported > 0 && remainingToImport > 0) {
    message = `${imported} new video${imported === 1 ? "" : "s"} imported safely. ${remainingToImport} more new video${remainingToImport === 1 ? "" : "s"} remain for the next sync.`;
  } else if (imported > 0) {
    message = `${imported} new video${imported === 1 ? "" : "s"} imported.`;
  } else if (concurrentSkipped > 0) {
    message = "Another overlapping sync already imported the same videos. No duplicates were created.";
  } else if (missingItems.length > 0 && importLimit === 0) {
    message = `${missingItems.length} new video${missingItems.length === 1 ? "" : "s"} found, but this run had no import budget.`;
  }

  return {
    cardId: card.$id,
    cardTitle,
    matchKeyword,
    playlistId,
    totalPlaylistItems: playlistItems.length,
    availablePlaylistItems: availableItems.length,
    newVideosFound: missingItems.length,
    processedNewVideos: batch.length,
    imported,
    skipped,
    unavailable,
    remainingToImport,
    importLimit,
    existingVodsRead: existing.documentsRead,
    existingReadPages: existing.pagesRead,
    message,
  };
}

export async function listAllSportTierCards(
  context: YouTubeSyncContext,
): Promise<StarterPlanCard[]> {
  const cards: StarterPlanCard[] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const result = await context.databases.listDocuments(
      context.databaseId,
      context.cardsCollectionId,
      [
        Query.orderDesc("$createdAt"),
        Query.limit(limit),
        Query.offset(offset),
      ],
    );

    cards.push(...(result.documents as unknown as StarterPlanCard[]));
    offset += result.documents.length;

    if (
      result.documents.length === 0 ||
      result.documents.length < limit ||
      offset >= result.total
    ) {
      break;
    }
  }

  return cards;
}
