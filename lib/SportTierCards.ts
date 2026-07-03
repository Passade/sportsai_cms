import { Client, Databases, ID, Models, Query } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
const sportTierCardsCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_SPORT_TIER_CARDS_COLLECTION_ID || "";

const client = new Client();

if (endpoint && projectId) {
  client.setEndpoint(endpoint).setProject(projectId);
}

const databases = new Databases(client);

export type CmsSportTierCard = Models.Document & {
  name?: string;
  category?: string;
  sport?: string;
  imageUrl?: string;
  isActive?: boolean;
};

export type CreateSportTierCardInput = {
  name: string;
  category: string;
  sport: string;
  imageUrl: string;
  isActive: boolean;
};

type ActiveFilter = "all" | "active" | "inactive";

type SportsTierCardsPageParams = {
  cursor?: string;
  direction?: "next" | "previous";
  active?: ActiveFilter;
  limit?: number;
};

function assertSportTierConfig() {
  if (!endpoint) throw new Error("Missing NEXT_PUBLIC_APPWRITE_ENDPOINT.");
  if (!projectId) throw new Error("Missing NEXT_PUBLIC_APPWRITE_PROJECT_ID.");
  if (!databaseId) throw new Error("Missing NEXT_PUBLIC_APPWRITE_DATABASE_ID.");
  if (!sportTierCardsCollectionId) {
    throw new Error(
      "Missing NEXT_PUBLIC_APPWRITE_SPORT_TIER_CARDS_COLLECTION_ID."
    );
  }
}

function normalizeCardInput(input: CreateSportTierCardInput) {
  return {
    name: input.name.trim(),
    category: input.category.trim(),
    sport: input.sport.trim(),
    imageUrl: input.imageUrl.trim(),
    isActive: Boolean(input.isActive),
  };
}

export async function getCmsSportsTierCardsPage({
  cursor,
  direction = "next",
  active = "all",
  limit = 25,
}: SportsTierCardsPageParams = {}) {
  assertSportTierConfig();

  const queries = [Query.orderDesc("$createdAt"), Query.limit(limit)];

  if (active === "active") {
    queries.push(Query.equal("isActive", true));
  }

  if (active === "inactive") {
    queries.push(Query.equal("isActive", false));
  }

  if (cursor) {
    queries.push(
      direction === "previous" ? Query.cursorBefore(cursor) : Query.cursorAfter(cursor)
    );
  }

  const response = await databases.listDocuments(
    databaseId,
    sportTierCardsCollectionId,
    queries
  );

  const documents = response.documents as CmsSportTierCard[];

  return {
    documents,
    total: response.total,
    nextCursor: documents.length > 0 ? documents[documents.length - 1].$id : null,
    previousCursor: documents.length > 0 ? documents[0].$id : null,
  };
}

export async function getCmsSportsTierCardById(id: string) {
  assertSportTierConfig();

  return (await databases.getDocument(
    databaseId,
    sportTierCardsCollectionId,
    id
  )) as CmsSportTierCard;
}

export async function createCmsSportsTierCard(input: CreateSportTierCardInput) {
  assertSportTierConfig();

  return (await databases.createDocument(
    databaseId,
    sportTierCardsCollectionId,
    ID.unique(),
    normalizeCardInput(input)
  )) as CmsSportTierCard;
}

export async function updateCmsSportsTierCard(
  id: string,
  input: CreateSportTierCardInput
) {
  assertSportTierConfig();

  return (await databases.updateDocument(
    databaseId,
    sportTierCardsCollectionId,
    id,
    normalizeCardInput(input)
  )) as CmsSportTierCard;
}

export async function setCmsSportsTierCardActive(id: string, isActive: boolean) {
  assertSportTierConfig();

  return (await databases.updateDocument(
    databaseId,
    sportTierCardsCollectionId,
    id,
    {
      isActive,
    }
  )) as CmsSportTierCard;
}

export async function deleteCmsSportsTierCard(id: string) {
  assertSportTierConfig();

  await databases.deleteDocument(databaseId, sportTierCardsCollectionId, id);
}
