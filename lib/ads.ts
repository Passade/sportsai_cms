import { config, databases, ID, Query } from "@/lib/appwrite";

const ADS_PAGE_SIZE = 25;

const ADS_LIST_SELECT = [
  "$id",
  "$createdAt",
  "$updatedAt",
  "title",
  "imageUrl",
  "linkType",
  "linkId",
  "sortOrder",
  "isActive",
];

function getAdsCollectionId() {
  return (
    process.env.NEXT_PUBLIC_APPWRITE_AD_BANNERS_COLLECTION_ID ||
    process.env.NEXT_PUBLIC_APPWRITE_ADS_COLLECTION_ID ||
    "ad_banners"
  );
}

export type CmsAdBanner = {
  $id: string;
  $createdAt?: string;
  $updatedAt?: string;
  title?: string;
  imageUrl?: string;
  linkType?: string;
  linkId?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type CreateAdBannerInput = {
  title: string;
  imageUrl: string;
  linkType: string;
  linkId: string;
  sortOrder: string;
  isActive: boolean;
};

export type AdBannersPageResult = {
  documents: CmsAdBanner[];
  total: number;
  nextCursor: string | null;
  previousCursor: string | null;
  hasNextPage: boolean;
};

function toInteger(value: string, fallback = 999) {
  const parsed = Number.parseInt(String(value || ""), 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}

function isValidHttpUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return false;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildAdBannerData(input: CreateAdBannerInput) {
  const imageUrl = input.imageUrl.trim();

  if (!imageUrl) {
    throw new Error("Image URL is required.");
  }

  if (!isValidHttpUrl(imageUrl)) {
    throw new Error("Image URL must be a valid http or https URL.");
  }

  return {
    title: input.title.trim(),
    imageUrl,
    linkType: input.linkType.trim(),
    linkId: input.linkId.trim(),
    sortOrder: toInteger(input.sortOrder, 999),
    isActive: input.isActive,
  };
}

function normalizeAdBanner(document: any): CmsAdBanner {
  return {
    $id: document.$id,
    $createdAt: document.$createdAt,
    $updatedAt: document.$updatedAt,
    title: document.title || "",
    imageUrl: document.imageUrl || "",
    linkType: document.linkType || "",
    linkId: document.linkId || "",
    sortOrder:
      typeof document.sortOrder === "number" ? document.sortOrder : 999,
    isActive: Boolean(document.isActive),
  };
}

export async function getCmsAdBannersPage(options?: {
  cursor?: string;
  direction?: "next" | "previous";
  active?: "all" | "active" | "inactive";
  limit?: number;
}) {
  const limit = options?.limit || ADS_PAGE_SIZE;

  const queries = [
    Query.orderAsc("sortOrder"),
    Query.orderDesc("$createdAt"),
    Query.limit(limit),
    Query.select(ADS_LIST_SELECT),
  ];

  if (options?.active === "active") {
    queries.push(Query.equal("isActive", true));
  }

  if (options?.active === "inactive") {
    queries.push(Query.equal("isActive", false));
  }

  if (options?.cursor && options.direction === "next") {
    queries.push(Query.cursorAfter(options.cursor));
  }

  if (options?.cursor && options.direction === "previous") {
    queries.push(Query.cursorBefore(options.cursor));
  }

  const result = await databases.listDocuments(
    config.databaseId,
    getAdsCollectionId(),
    queries
  );

  const documents = result.documents.map(normalizeAdBanner);

  return {
    documents,
    total: result.total,
    nextCursor: documents.length ? documents[documents.length - 1].$id : null,
    previousCursor: documents.length ? documents[0].$id : null,
    hasNextPage: documents.length === limit,
  } as AdBannersPageResult;
}

export async function getCmsAdBanners() {
  const page = await getCmsAdBannersPage();
  return page.documents;
}

export async function getCmsAdBannerById(id: string) {
  const document = await databases.getDocument(
    config.databaseId,
    getAdsCollectionId(),
    id
  );

  return normalizeAdBanner(document);
}

export async function createCmsAdBanner(input: CreateAdBannerInput) {
  return databases.createDocument(
    config.databaseId,
    getAdsCollectionId(),
    ID.unique(),
    buildAdBannerData(input)
  );
}

export async function updateCmsAdBanner(id: string, input: CreateAdBannerInput) {
  return databases.updateDocument(
    config.databaseId,
    getAdsCollectionId(),
    id,
    buildAdBannerData(input)
  );
}

export async function deleteCmsAdBanner(id: string) {
  return databases.deleteDocument(config.databaseId, getAdsCollectionId(), id);
}

export async function setCmsAdBannerActive(id: string, isActive: boolean) {
  const updated = await databases.updateDocument(
    config.databaseId,
    getAdsCollectionId(),
    id,
    {
      isActive,
    }
  );

  return normalizeAdBanner(updated);
}
