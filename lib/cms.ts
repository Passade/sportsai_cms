import { config, databases, ID, Query } from "./appwrite";

export type EventStatus =
  | "upcoming"
  | "live"
  | "waiting"
  | "completed"
  | "cancelled"
  | "vod"
  | "hidden";

export type FixtureStatus =
  | "upcoming"
  | "live"
  | "completed"
  | "cancelled"
  | "hidden";

export type VodType = "video" | "youtube";

export type CmsTeam = {
  $id: string;
  name?: string;
  shortName?: string;
  logoUrl?: string;
};

export type CreateTeamInput = {
  name: string;
  shortName: string;
  logoUrl: string;
};

export type CmsPlayer = {
  $id: string;
  name?: string;
  school?: string;
  teamName?: string;
  sport?: string;
  position?: string;
  number?: number;
  dateOfBirth?: string;
  age?: number;
  country?: string;
  imageUrl?: string;
  active?: boolean;
  searchText?: string;
};

export type CreatePlayerInput = {
  name: string;
  school: string;
  teamName: string;
  sport: string;
  position: string;
  number: string;
  dateOfBirth: string;
  age: string;
  country: string;
  imageUrl: string;
  active: boolean;
};

export type CmsFixture = {
  $id: string;
  homeTeam?: string;
  awayTeam?: string;
  sport?: string;
  communityName?: string;
  competition?: string;
  venue?: string;
  matchDate?: string;
  status?: FixtureStatus | string;
  homeScore?: number;
  awayScore?: number;
  isStreamed?: boolean;
  streamId?: string;
  searchText?: string;
};

export type CreateFixtureInput = {
  homeTeam: string;
  awayTeam: string;
  sport: string;
  communityName: string;
  competition: string;
  venue: string;
  matchDate: string;
  status: FixtureStatus;
  homeScore: string;
  awayScore: string;
  isStreamed: boolean;
};

export type CmsPrediction = {
  $id: string;
  userName?: string;
  sport?: string;
  communityName?: string;
  predictedWinner?: string;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
  pointsAwarded?: number;
  userId?: string;
  predictionStatus?: string;
};

export type CreateEventInput = {
  title: string;
  status: EventStatus;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  venue: string;
  thumbnail: string;
  streamUrl: string;
  vodUrl: string;
  description: string;
  competition: string;
  isFeatured: boolean;
  sport: string;
  vodType: VodType;
  fixturesId: string;
};

export function buildSearchText(data: Record<string, any>) {
  return [
    data.title,
    data.status,
    data.homeTeam,
    data.awayTeam,
    data.venue,
    data.description,
    data.competition,
    data.sport,
    data.vodType,
    data.matchDate,
    data.name,
    data.school,
    data.teamName,
    data.position,
    data.number,
    data.age,
    data.country,
    data.communityName,
    data.homeScore,
    data.awayScore,
    data.streamId,
  ]
    .filter((value) => value !== undefined && value !== null && value !== "")
    .map((value) => String(value))
    .join(" ")
    .toLowerCase();
}

function toInteger(value: string) {
  const parsed = Number.parseInt(String(value || "0"), 10);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

function toDateInputValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toDateTimeLocalInputValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
  if (!value) {
    return new Date().toISOString();
  }

  return new Date(value).toISOString();
}

function normalizeText(value?: string) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDateTimeMs(value?: string) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getTime();
}

function isSameFixtureIdentity(
  existingFixture: CmsFixture,
  newFixture: {
    homeTeam: string;
    awayTeam: string;
    matchDate: string;
    competition: string;
  }
) {
  const sameHomeTeam =
    normalizeText(existingFixture.homeTeam) === normalizeText(newFixture.homeTeam);

  const sameAwayTeam =
    normalizeText(existingFixture.awayTeam) === normalizeText(newFixture.awayTeam);

  const sameCompetition =
    normalizeText(existingFixture.competition) ===
    normalizeText(newFixture.competition);

  const existingTime = normalizeDateTimeMs(existingFixture.matchDate);
  const newTime = normalizeDateTimeMs(newFixture.matchDate);

  // Treat fixtures as duplicates if the match time is the same minute.
  // This protects against tiny second/millisecond differences.
  const sameMatchMinute =
    existingTime > 0 &&
    newTime > 0 &&
    Math.abs(existingTime - newTime) < 60 * 1000;

  return sameHomeTeam && sameAwayTeam && sameCompetition && sameMatchMinute;
}

function getActualWinner(fixture: CmsFixture) {
  const homeScore = Number(fixture.homeScore ?? 0);
  const awayScore = Number(fixture.awayScore ?? 0);

  if (homeScore > awayScore) {
    return fixture.homeTeam || "Home";
  }

  if (awayScore > homeScore) {
    return fixture.awayTeam || "Away";
  }

  return "Draw";
}

function buildPlayerData(input: CreatePlayerInput) {
  const data: Record<string, any> = {
    name: input.name.trim(),
    school: input.school.trim(),
    teamName: input.teamName.trim(),
    sport: input.sport.trim(),
    position: input.position.trim(),
    number: toInteger(input.number),
    age: toInteger(input.age),
    country: input.country.trim(),
    imageUrl: input.imageUrl.trim(),
    active: input.active,
  };

  if (input.dateOfBirth) {
    data.dateOfBirth = new Date(input.dateOfBirth).toISOString();
  }

  data.searchText = buildSearchText(data);

  return data;
}

function buildFixtureData(input: CreateFixtureInput) {
  const data = {
    homeTeam: input.homeTeam.trim(),
    awayTeam: input.awayTeam.trim(),
    sport: input.sport.trim(),
    communityName: input.communityName.trim(),
    competition: input.competition.trim(),
    venue: input.venue.trim(),
    matchDate: toIsoDateTime(input.matchDate),
    status: input.status,
    homeScore: toInteger(input.homeScore),
    awayScore: toInteger(input.awayScore),
    isStreamed: input.isStreamed,
  };

  return {
    ...data,
    searchText: buildSearchText(data),
  };
}

export function normalizeDateForInput(value?: string) {
  return toDateInputValue(value);
}

export function normalizeDateTimeForInput(value?: string) {
  return toDateTimeLocalInputValue(value);
}

export async function getCmsTeams() {
  const result = await databases.listDocuments(
    config.databaseId,
    config.teamsCollectionId,
    [Query.limit(500)]
  );

  return result.documents
    .map((team: any) => ({
      $id: team.$id,
      name: team.name || "",
      shortName: team.shortName || "",
      logoUrl: team.logoUrl || "",
    }))
    .filter((team) => team.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCmsTeamById(id: string) {
  return databases.getDocument(config.databaseId, config.teamsCollectionId, id);
}

export async function createCmsTeam(input: CreateTeamInput) {
  const data = {
    name: input.name.trim(),
    shortName: input.shortName.trim(),
    logoUrl: input.logoUrl.trim(),
  };

  return databases.createDocument(
    config.databaseId,
    config.teamsCollectionId,
    ID.unique(),
    data
  );
}

export async function updateCmsTeam(id: string, input: CreateTeamInput) {
  const data = {
    name: input.name.trim(),
    shortName: input.shortName.trim(),
    logoUrl: input.logoUrl.trim(),
  };

  return databases.updateDocument(
    config.databaseId,
    config.teamsCollectionId,
    id,
    data
  );
}

export async function deleteCmsTeam(id: string) {
  return databases.deleteDocument(config.databaseId, config.teamsCollectionId, id);
}

export async function getCmsPlayers() {
  const result = await databases.listDocuments(
    config.databaseId,
    config.playersCollectionId,
    [Query.limit(500)]
  );

  return result.documents
    .map((player: any) => ({
      $id: player.$id,
      name: player.name || "",
      school: player.school || "",
      teamName: player.teamName || "",
      sport: player.sport || "",
      position: player.position || "",
      number: typeof player.number === "number" ? player.number : 0,
      dateOfBirth: player.dateOfBirth || "",
      age: typeof player.age === "number" ? player.age : 0,
      country: player.country || "",
      imageUrl: player.imageUrl || "",
      active: Boolean(player.active),
      searchText: player.searchText || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCmsPlayerById(id: string) {
  return databases.getDocument(
    config.databaseId,
    config.playersCollectionId,
    id
  );
}

export async function createCmsPlayer(input: CreatePlayerInput) {
  return databases.createDocument(
    config.databaseId,
    config.playersCollectionId,
    ID.unique(),
    buildPlayerData(input)
  );
}

export async function updateCmsPlayer(id: string, input: CreatePlayerInput) {
  return databases.updateDocument(
    config.databaseId,
    config.playersCollectionId,
    id,
    buildPlayerData(input)
  );
}

export async function deleteCmsPlayer(id: string) {
  return databases.deleteDocument(
    config.databaseId,
    config.playersCollectionId,
    id
  );
}

export async function getCmsFixtures() {
  const result = await databases.listDocuments(
    config.databaseId,
    config.fixturesCollectionId,
    [Query.orderDesc("matchDate"), Query.limit(500)]
  );

  return result.documents.map((fixture: any) => ({
    $id: fixture.$id,
    homeTeam: fixture.homeTeam || "",
    awayTeam: fixture.awayTeam || "",
    sport: fixture.sport || "",
    communityName: fixture.communityName || "",
    competition: fixture.competition || "",
    venue: fixture.venue || "",
    matchDate: fixture.matchDate || "",
    status: fixture.status || "upcoming",
    homeScore: typeof fixture.homeScore === "number" ? fixture.homeScore : 0,
    awayScore: typeof fixture.awayScore === "number" ? fixture.awayScore : 0,
    isStreamed: Boolean(fixture.isStreamed),
    streamId: fixture.streamId || "",
    searchText: fixture.searchText || "",
  }));
}

export async function getCmsFixtureById(id: string) {
  return databases.getDocument(
    config.databaseId,
    config.fixturesCollectionId,
    id
  );
}

export async function findDuplicateCmsFixture(input: CreateFixtureInput) {
  const newFixture = buildFixtureData(input);

  // No Appwrite field filters are used here on purpose.
  // This avoids needing extra Appwrite indexes and still prevents duplicates
  // for the current CMS scale by checking the latest 500 fixtures client-side.
  const fixtures = await getCmsFixtures();

  return fixtures.find((fixture) =>
    isSameFixtureIdentity(fixture, {
      homeTeam: newFixture.homeTeam,
      awayTeam: newFixture.awayTeam,
      matchDate: newFixture.matchDate,
      competition: newFixture.competition,
    })
  );
}

export async function createCmsFixture(input: CreateFixtureInput) {
  const duplicate = await findDuplicateCmsFixture(input);

  if (duplicate) {
    throw new Error(
      `This fixture already exists: ${duplicate.homeTeam || "Home"} vs ${
        duplicate.awayTeam || "Away"
      } on ${duplicate.matchDate || "the same date"} in ${
        duplicate.competition || "the same competition"
      }. Existing fixture ID: ${duplicate.$id}`
    );
  }

  return databases.createDocument(
    config.databaseId,
    config.fixturesCollectionId,
    ID.unique(),
    buildFixtureData(input)
  );
}

export async function updateCmsFixture(id: string, input: CreateFixtureInput) {
  const duplicate = await findDuplicateCmsFixture(input);

  if (duplicate && duplicate.$id !== id) {
    throw new Error(
      `Another fixture already exists with the same teams, match date and competition. Existing fixture ID: ${duplicate.$id}`
    );
  }

  return databases.updateDocument(
    config.databaseId,
    config.fixturesCollectionId,
    id,
    buildFixtureData(input)
  );
}

export async function updateCmsFixtureStatus(id: string, status: FixtureStatus) {
  const fixture: any = await getCmsFixtureById(id);

  const data = {
    homeTeam: fixture.homeTeam || "",
    awayTeam: fixture.awayTeam || "",
    sport: fixture.sport || "",
    communityName: fixture.communityName || "",
    competition: fixture.competition || "",
    venue: fixture.venue || "",
    matchDate: fixture.matchDate || "",
    status,
    homeScore: typeof fixture.homeScore === "number" ? fixture.homeScore : 0,
    awayScore: typeof fixture.awayScore === "number" ? fixture.awayScore : 0,
    isStreamed: Boolean(fixture.isStreamed),
    streamId: fixture.streamId || "",
  };

  return databases.updateDocument(
    config.databaseId,
    config.fixturesCollectionId,
    id,
    {
      status,
      searchText: buildSearchText(data),
    }
  );
}

export async function deleteCmsFixture(id: string) {
  return databases.deleteDocument(
    config.databaseId,
    config.fixturesCollectionId,
    id
  );
}

export async function getCmsPredictionsForFixture(fixtureId: string) {
  const result = await databases.listDocuments(
    config.databaseId,
    config.predictionsCollectionId,
    [Query.equal("fixtureId", fixtureId), Query.limit(500)]
  );

  return result.documents.map((prediction: any) => ({
    $id: prediction.$id,
    userName: prediction.userName || "",
    fixtureId: prediction.fixtureId || "",
    sport: prediction.sport || "",
    communityName: prediction.communityName || "",
    predictedWinner: prediction.predictedWinner || "",
    predictedHomeScore:
      typeof prediction.predictedHomeScore === "number"
        ? prediction.predictedHomeScore
        : 0,
    predictedAwayScore:
      typeof prediction.predictedAwayScore === "number"
        ? prediction.predictedAwayScore
        : 0,
    pointsAwarded:
      typeof prediction.pointsAwarded === "number" ? prediction.pointsAwarded : 0,
    userId: prediction.userId || "",
    predictionStatus: prediction.predictionStatus || "",
  }));
}

export function calculatePredictionPoints(
  fixture: CmsFixture,
  prediction: CmsPrediction
) {
  const actualWinner = getActualWinner(fixture);
  const predictedWinner = prediction.predictedWinner || "";
  const winnerCorrect =
    normalizeText(predictedWinner) === normalizeText(actualWinner) ||
    (normalizeText(actualWinner) === "draw" &&
      ["draw", "tie"].includes(normalizeText(predictedWinner)));

  const exactScore =
    Number(prediction.predictedHomeScore ?? 0) ===
      Number(fixture.homeScore ?? 0) &&
    Number(prediction.predictedAwayScore ?? 0) === Number(fixture.awayScore ?? 0);

  let points = 0;

  if (winnerCorrect) {
    points += 3;
  }

  if (exactScore) {
    points += 2;
  }

  return {
    actualWinner,
    winnerCorrect,
    exactScore,
    points,
  };
}

export async function scoreCmsPredictionsForFixture(fixtureId: string) {
  const fixture: any = await getCmsFixtureById(fixtureId);
  const predictions = await getCmsPredictionsForFixture(fixtureId);

  const normalizedFixture: CmsFixture = {
    $id: fixture.$id,
    homeTeam: fixture.homeTeam || "",
    awayTeam: fixture.awayTeam || "",
    homeScore: typeof fixture.homeScore === "number" ? fixture.homeScore : 0,
    awayScore: typeof fixture.awayScore === "number" ? fixture.awayScore : 0,
  };

  let totalScored = 0;

  for (const prediction of predictions) {
    const result = calculatePredictionPoints(normalizedFixture, prediction);

    await databases.updateDocument(
      config.databaseId,
      config.predictionsCollectionId,
      prediction.$id,
      {
        pointsAwarded: result.points,
        predictionStatus: "scored",
      }
    );

    totalScored += 1;
  }

  await databases.updateDocument(
    config.databaseId,
    config.fixturesCollectionId,
    fixtureId,
    {
      status: "completed",
    }
  );

  return {
    totalScored,
    actualWinner: getActualWinner(normalizedFixture),
  };
}

export async function getCmsEvents() {
  const result = await databases.listDocuments(
    config.databaseId,
    config.streamsCollectionId,
    [Query.orderDesc("$createdAt"), Query.limit(100)]
  );

  return result.documents;
}

export async function getCmsEventById(id: string) {
  return databases.getDocument(config.databaseId, config.streamsCollectionId, id);
}

export async function createCmsEvent(input: CreateEventInput) {
  const title =
    input.title.trim() ||
    `${input.homeTeam.trim() || "Home"} vs ${input.awayTeam.trim() || "Away"}`;

  const matchDate = input.matchDate
    ? new Date(input.matchDate).toISOString()
    : new Date().toISOString();

  const data = {
    title,
    status: input.status,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    matchDate,
    venue: input.venue,
    thumbnail: input.thumbnail,
    streamUrl: input.streamUrl,
    vodUrl: input.vodUrl,
    description: input.description,
    competition: input.competition,
    isFeatured: input.isFeatured,
    sport: input.sport,
    vodType: input.vodType,
    fixturesId: input.fixturesId,
  };

  return databases.createDocument(
    config.databaseId,
    config.streamsCollectionId,
    ID.unique(),
    {
      ...data,
      searchText: buildSearchText(data),
    }
  );
}

export async function updateCmsEvent(id: string, input: CreateEventInput) {
  const title =
    input.title.trim() ||
    `${input.homeTeam.trim() || "Home"} vs ${input.awayTeam.trim() || "Away"}`;

  const matchDate = input.matchDate
    ? new Date(input.matchDate).toISOString()
    : new Date().toISOString();

  const data = {
    title,
    status: input.status,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
    matchDate,
    venue: input.venue,
    thumbnail: input.thumbnail,
    streamUrl: input.streamUrl,
    vodUrl: input.vodUrl,
    description: input.description,
    competition: input.competition,
    isFeatured: input.isFeatured,
    sport: input.sport,
    vodType: input.vodType,
    fixturesId: input.fixturesId,
  };

  return databases.updateDocument(
    config.databaseId,
    config.streamsCollectionId,
    id,
    {
      ...data,
      searchText: buildSearchText(data),
    }
  );
}

export async function deleteCmsEvent(id: string) {
  return databases.deleteDocument(config.databaseId, config.streamsCollectionId, id);
}

async function safeDeleteFixture(id: string) {
  try {
    await deleteCmsFixture(id);
  } catch (error: any) {
    if (error?.code === 404) {
      return;
    }

    throw error;
  }
}

async function safeDeleteEvent(id: string) {
  try {
    await deleteCmsEvent(id);
  } catch (error: any) {
    if (error?.code === 404) {
      return;
    }

    throw error;
  }
}

export async function deleteCmsEventAndFixture(
  eventId: string,
  fixturesId?: string
) {
  const fixtureIdsToDelete = new Set<string>();

  if (fixturesId && fixturesId.trim()) {
    fixtureIdsToDelete.add(fixturesId.trim());
  }

  const linkedFixtures = await databases.listDocuments(
    config.databaseId,
    config.fixturesCollectionId,
    [Query.equal("streamId", eventId), Query.limit(100)]
  );

  linkedFixtures.documents.forEach((fixture: any) => {
    if (fixture.$id) {
      fixtureIdsToDelete.add(fixture.$id);
    }
  });

  for (const fixtureId of fixtureIdsToDelete) {
    await safeDeleteFixture(fixtureId);
  }

  await safeDeleteEvent(eventId);

  return {
    deletedEventId: eventId,
    deletedFixtureIds: Array.from(fixtureIdsToDelete),
  };
}


/* COMMUNITY CMS */

export type CommunityPostKind = "poll" | "image" | "fixture" | "debate";

export type CmsCommunityPost = {
  $id: string;
  kind?: CommunityPostKind;
  source?: string;
  handle?: string;
  title?: string;
  question?: string;
  tag?: string;
  postImageUrl?: string;
  votesCount?: number;
  selectedOptionId?: string;
  createdBy?: string;
  sortOrder?: number;
  publishedAt?: string;
  isActive?: boolean;
  reactionsCount?: number;
};

export type CmsCommunityPostOption = {
  $id: string;
  postId?: string;
  label?: string;
  imageUrl?: string;
  votesCount?: number;
  percentage?: number;
  sortOrder?: number;
  isActive?: boolean;
};

export type CreateCommunityPostInput = {
  kind: CommunityPostKind;
  source: string;
  handle: string;
  title: string;
  question: string;
  tag: string;
  postImageUrl: string;
  sortOrder: string;
  publishedAt: string;
  isActive: boolean;
};

export type CreateCommunityPostOptionInput = {
  label: string;
  imageUrl: string;
  sortOrder: string;
  isActive: boolean;
};

function communityNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function communityDateTime(value: string) {
  if (!value) return new Date().toISOString();
  return new Date(value).toISOString();
}

function communityDateTimeForInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function buildCommunityPostCreateData(input: CreateCommunityPostInput) {
  const data: Record<string, any> = {
    kind: input.kind,
    source: input.source.trim(),
    handle: input.handle.trim(),
    title: input.title.trim(),
    question: input.question.trim(),
    tag: input.tag.trim(),
    votesCount: 0,
    selectedOptionId: "",
    createdBy: "cms",
    sortOrder: communityNumber(input.sortOrder, 999),
    publishedAt: communityDateTime(input.publishedAt),
    isActive: input.isActive,
    reactionsCount: 0,
  };

  const postImageUrl = input.postImageUrl.trim();

  if (postImageUrl) {
    data.postImageUrl = postImageUrl;
  }

  return data;
}

function buildCommunityPostUpdateData(input: CreateCommunityPostInput) {
  const data: Record<string, any> = {
    kind: input.kind,
    source: input.source.trim(),
    handle: input.handle.trim(),
    title: input.title.trim(),
    question: input.question.trim(),
    tag: input.tag.trim(),
    sortOrder: communityNumber(input.sortOrder, 999),
    publishedAt: communityDateTime(input.publishedAt),
    isActive: input.isActive,
  };

  const postImageUrl = input.postImageUrl.trim();

  if (postImageUrl) {
    data.postImageUrl = postImageUrl;
  }

  return data;
}

function buildCommunityOptionCreateData(
  postId: string,
  input: CreateCommunityPostOptionInput
) {
  const data: Record<string, any> = {
    postId,
    label: input.label.trim(),
    votesCount: 0,
    percentage: 0,
    sortOrder: communityNumber(input.sortOrder, 999),
    isActive: input.isActive,
  };

  const imageUrl = input.imageUrl.trim();

  if (imageUrl) {
    data.imageUrl = imageUrl;
  }

  return data;
}

function buildCommunityOptionUpdateData(input: CreateCommunityPostOptionInput) {
  const data: Record<string, any> = {
    label: input.label.trim(),
    sortOrder: communityNumber(input.sortOrder, 999),
    isActive: input.isActive,
  };

  const imageUrl = input.imageUrl.trim();

  if (imageUrl) {
    data.imageUrl = imageUrl;
  }

  return data;
}

export function normalizeCommunityPublishedAtForInput(value?: string) {
  return communityDateTimeForInput(value);
}

export async function getCmsCommunityPosts() {
  const result = await databases.listDocuments(
    config.databaseId,
    config.communityPostsCollectionId,
    [Query.orderAsc("sortOrder"), Query.orderDesc("publishedAt"), Query.limit(500)]
  );

  return result.documents.map((post: any) => ({
    $id: post.$id,
    kind: post.kind || "image",
    source: post.source || "",
    handle: post.handle || "",
    title: post.title || "",
    question: post.question || "",
    tag: post.tag || "",
    postImageUrl: post.postImageUrl || "",
    votesCount: typeof post.votesCount === "number" ? post.votesCount : 0,
    selectedOptionId: post.selectedOptionId || "",
    createdBy: post.createdBy || "",
    sortOrder: typeof post.sortOrder === "number" ? post.sortOrder : 999,
    publishedAt: post.publishedAt || "",
    isActive: Boolean(post.isActive),
    reactionsCount:
      typeof post.reactionsCount === "number" ? post.reactionsCount : 0,
  })) as CmsCommunityPost[];
}

export async function getCmsCommunityPostById(id: string) {
  return databases.getDocument(
    config.databaseId,
    config.communityPostsCollectionId,
    id
  );
}

export async function getCmsCommunityOptionsForPost(postId: string) {
  const result = await databases.listDocuments(
    config.databaseId,
    config.communityPostOptionsCollectionId,
    [Query.equal("postId", postId), Query.orderAsc("sortOrder"), Query.limit(100)]
  );

  return result.documents.map((option: any) => ({
    $id: option.$id,
    postId: option.postId || "",
    label: option.label || "",
    imageUrl: option.imageUrl || "",
    votesCount: typeof option.votesCount === "number" ? option.votesCount : 0,
    percentage: typeof option.percentage === "number" ? option.percentage : 0,
    sortOrder: typeof option.sortOrder === "number" ? option.sortOrder : 999,
    isActive: Boolean(option.isActive),
  })) as CmsCommunityPostOption[];
}

export async function createCmsCommunityPost(
  input: CreateCommunityPostInput,
  options: CreateCommunityPostOptionInput[]
) {
  const post = await databases.createDocument(
    config.databaseId,
    config.communityPostsCollectionId,
    ID.unique(),
    buildCommunityPostCreateData(input)
  );

  if (input.kind === "poll" || input.kind === "debate") {
    for (const option of options.filter((item) => item.label.trim())) {
      await databases.createDocument(
        config.databaseId,
        config.communityPostOptionsCollectionId,
        ID.unique(),
        buildCommunityOptionCreateData(post.$id, option)
      );
    }
  }

  return post;
}

export async function updateCmsCommunityPost(
  id: string,
  input: CreateCommunityPostInput
) {
  return databases.updateDocument(
    config.databaseId,
    config.communityPostsCollectionId,
    id,
    buildCommunityPostUpdateData(input)
  );
}

async function safeDeleteCommunityDocument(
  collectionId: string,
  documentId: string
) {
  try {
    await databases.deleteDocument(config.databaseId, collectionId, documentId);
  } catch (error) {
    console.warn("Community delete skipped:", collectionId, documentId, error);
  }
}

async function listAllCommunityDocumentsByField(
  collectionId: string,
  field: string,
  value: string
) {
  const documents: any[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const result = await databases.listDocuments(
      config.databaseId,
      collectionId,
      [Query.equal(field, value), Query.limit(limit), Query.offset(offset)]
    );

    documents.push(...result.documents);

    if (result.documents.length < limit) {
      break;
    }

    offset += limit;
  }

  return documents;
}

export async function deleteCmsCommunityPost(id: string) {
  const options = await getCmsCommunityOptionsForPost(id);

  /*
   * Poll/debate posts have child option rows. Some installs also have
   * vote/reaction rows. Delete those first, then options, then the post.
   */

  for (const option of options) {
    try {
      const optionVotes = await listAllCommunityDocumentsByField(
        config.communityPostVotesCollectionId,
        "optionId",
        option.$id
      );

      for (const vote of optionVotes) {
        await safeDeleteCommunityDocument(
          config.communityPostVotesCollectionId,
          vote.$id
        );
      }
    } catch (error) {
      console.warn("Could not delete votes by optionId:", option.$id, error);
    }
  }

  try {
    const postVotes = await listAllCommunityDocumentsByField(
      config.communityPostVotesCollectionId,
      "postId",
      id
    );

    for (const vote of postVotes) {
      await safeDeleteCommunityDocument(
        config.communityPostVotesCollectionId,
        vote.$id
      );
    }
  } catch (error) {
    console.warn("Could not delete votes by postId:", id, error);
  }

  try {
    const reactions = await listAllCommunityDocumentsByField(
      config.communityPostReactionsCollectionId,
      "postId",
      id
    );

    for (const reaction of reactions) {
      await safeDeleteCommunityDocument(
        config.communityPostReactionsCollectionId,
        reaction.$id
      );
    }
  } catch (error) {
    console.warn("Could not delete reactions by postId:", id, error);
  }

  for (const option of options) {
    await safeDeleteCommunityDocument(
      config.communityPostOptionsCollectionId,
      option.$id
    );
  }

  return databases.deleteDocument(
    config.databaseId,
    config.communityPostsCollectionId,
    id
  );
}

export async function createCmsCommunityOption(
  postId: string,
  input: CreateCommunityPostOptionInput
) {
  return databases.createDocument(
    config.databaseId,
    config.communityPostOptionsCollectionId,
    ID.unique(),
    buildCommunityOptionCreateData(postId, input)
  );
}

export async function updateCmsCommunityOption(
  optionId: string,
  input: CreateCommunityPostOptionInput
) {
  return databases.updateDocument(
    config.databaseId,
    config.communityPostOptionsCollectionId,
    optionId,
    buildCommunityOptionUpdateData(input)
  );
}

export async function deleteCmsCommunityOption(optionId: string) {
  return databases.deleteDocument(
    config.databaseId,
    config.communityPostOptionsCollectionId,
    optionId
  );
}
