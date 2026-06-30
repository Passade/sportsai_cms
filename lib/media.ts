import { config, ID, Query, storage } from "@/lib/appwrite";

export type CmsMediaFile = {
  $id: string;
  name: string;
  mimeType: string;
  sizeOriginal: number;
  url: string;
  previewUrl: string;
  $createdAt?: string;
  $updatedAt?: string;
};

export type CmsMediaUploadResult = {
  file: any;
  url: string;
  previewUrl: string;
};

export type CmsMediaPageResult = {
  documents: CmsMediaFile[];
  total: number;
  nextCursor: string | null;
  previousCursor: string | null;
  hasNextPage: boolean;
};

function trimTrailingSlash(value: string) {
  return String(value || "").replace(/\/+$/, "");
}

function encodePart(value: string) {
  return encodeURIComponent(String(value || ""));
}

function buildStorageUrl(fileId: string, mode: "view" | "preview") {
  const endpoint = trimTrailingSlash(config.endpoint);
  const bucketId = encodePart(config.mediaBucketId);
  const encodedFileId = encodePart(fileId);
  const projectId = encodePart(config.projectId);

  const base = `${endpoint}/storage/buckets/${bucketId}/files/${encodedFileId}/${mode}`;

  if (mode === "preview") {
    return `${base}?project=${projectId}&width=400&height=300&gravity=center&quality=85`;
  }

  return `${base}?project=${projectId}`;
}

function getMediaFileUrl(fileId: string) {
  return buildStorageUrl(fileId, "view");
}

function getMediaPreviewUrl(fileId: string) {
  return buildStorageUrl(fileId, "preview");
}

function normalizeMediaFile(file: any): CmsMediaFile {
  return {
    $id: file.$id,
    name: file.name || "Untitled file",
    mimeType: file.mimeType || "",
    sizeOriginal:
      typeof file.sizeOriginal === "number" ? file.sizeOriginal : 0,
    url: getMediaFileUrl(file.$id),
    previewUrl: getMediaPreviewUrl(file.$id),
    $createdAt: file.$createdAt,
    $updatedAt: file.$updatedAt,
  };
}

export async function uploadCmsMediaFile(file: File): Promise<CmsMediaUploadResult> {
  const uploaded = await storage.createFile(
    config.mediaBucketId,
    ID.unique(),
    file
  );

  return {
    file: uploaded,
    url: getMediaFileUrl(uploaded.$id),
    previewUrl: getMediaPreviewUrl(uploaded.$id),
  };
}

export async function listCmsMediaFilesPage(options?: {
  cursor?: string;
  direction?: "next" | "previous";
  limit?: number;
}) {
  const limit = options?.limit || 25;

  const queries = [Query.orderDesc("$createdAt"), Query.limit(limit)];

  if (options?.cursor && options.direction === "next") {
    queries.push(Query.cursorAfter(options.cursor));
  }

  if (options?.cursor && options.direction === "previous") {
    queries.push(Query.cursorBefore(options.cursor));
  }

  const result = await storage.listFiles(config.mediaBucketId, queries);

  const documents = result.files.map(normalizeMediaFile);

  return {
    documents,
    total: result.total,
    nextCursor: documents.length ? documents[documents.length - 1].$id : null,
    previousCursor: documents.length ? documents[0].$id : null,
    hasNextPage: documents.length === limit,
  } as CmsMediaPageResult;
}

/**
 * Old helper kept so other pages do not break.
 * It now only loads 25 files.
 */
export async function listCmsMediaFiles() {
  const page = await listCmsMediaFilesPage({
    limit: 25,
  });

  return page.documents;
}

export async function deleteCmsMediaFile(fileId: string) {
  return storage.deleteFile(config.mediaBucketId, fileId);
}
