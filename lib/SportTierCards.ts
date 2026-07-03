import { Client, Databases, ID, Query } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const sportTierCardsCollectionId =
  process.env.NEXT_PUBLIC_APPWRITE_SPORT_TIER_CARDS_COLLECTION_ID!;

export type SportTierCard = {
  $id: string;
  name?: string;
  category?: string;
  sport?: string;
  imageUrl?: string;
  isActive?: boolean;
  $createdAt?: string;
  $updatedAt?: string;
};

export type SportTierCardInput = {
  name: string;
  category: string;
  sport: string;
  imageUrl?: string;
  isActive: boolean;
};

const client = new Client().setEndpoint(endpoint).setProject(projectId);

const databases = new Databases(client);

export async function getSportTierCards() {
  const response = await databases.listDocuments(
    databaseId,
    sportTierCardsCollectionId,
    [
      Query.orderDesc("$createdAt"),
      Query.limit(100),
    ]
  );

  return response.documents as unknown as SportTierCard[];
}

export async function getSportTierCardById(id: string) {
  const response = await databases.getDocument(
    databaseId,
    sportTierCardsCollectionId,
    id
  );

  return response as unknown as SportTierCard;
}

export async function createSportTierCard(data: SportTierCardInput) {
  return databases.createDocument(
    databaseId,
    sportTierCardsCollectionId,
    ID.unique(),
    {
      name: data.name,
      category: data.category,
      sport: data.sport,
      imageUrl: data.imageUrl || "",
      isActive: data.isActive,
    }
  );
}

export async function updateSportTierCard(
  id: string,
  data: SportTierCardInput
) {
  return databases.updateDocument(
    databaseId,
    sportTierCardsCollectionId,
    id,
    {
      name: data.name,
      category: data.category,
      sport: data.sport,
      imageUrl: data.imageUrl || "",
      isActive: data.isActive,
    }
  );
}

export async function deleteSportTierCard(id: string) {
  return databases.deleteDocument(
    databaseId,
    sportTierCardsCollectionId,
    id
  );
}