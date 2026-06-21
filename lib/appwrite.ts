import { Account, Client, Databases, ID, Query } from "appwrite";

export const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,

  streamsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_STREAMS_COLLECTION_ID!,
  fixturesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_FIXTURES_COLLECTION_ID!,
  predictionsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_PREDICTIONS_COLLECTION_ID!,
  teamsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_TEAMS_COLLECTION_ID!,
  playersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_PLAYERS_COLLECTION_ID!,

  communityPostsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_COMMUNITY_POSTS_COLLECTION_ID!,
  communityPostOptionsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_COMMUNITY_POST_OPTIONS_COLLECTION_ID!,
  communityPostVotesCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_COMMUNITY_POST_VOTES_COLLECTION_ID!,
  communityPostReactionsCollectionId:
    process.env.NEXT_PUBLIC_APPWRITE_COMMUNITY_POST_REACTIONS_COLLECTION_ID!,
};

export const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId);

export const account = new Account(client);
export const databases = new Databases(client);

export { ID, Query };
