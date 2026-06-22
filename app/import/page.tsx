"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  CmsFixture,
  FixtureStatus,
  CmsPlayer,
  CmsTeam,
  createCmsFixture,
  createCmsPlayer,
  createCmsTeam,
  getCmsFixtures,
  getCmsPlayers,
  getCmsTeams,
} from "@/lib/cms";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type ImportMode = "teams" | "players" | "fixtures";
type ImportStatus = "ready" | "duplicate" | "invalid" | "imported" | "failed";

type TeamImportRow = {
  rowNumber: number;
  name: string;
  shortName: string;
  logoUrl: string;
  status: ImportStatus;
  message: string;
};

type PlayerImportRow = {
  rowNumber: number;
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
  active: string;
  status: ImportStatus;
  message: string;
};

type FixtureImportRow = {
  rowNumber: number;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  communityName: string;
  competition: string;
  venue: string;
  matchDate: string;
  status: string;
  homeScore: string;
  awayScore: string;
  isStreamed: string;
  streamId: string;
  statusResult: ImportStatus;
  message: string;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeDateKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return normalizeText(value);
  }

  return date.toISOString();
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);

  return values.map((value) => value.trim());
}

function parseCsv(csvText: string) {
  const cleanedText = csvText.replace(/^\uFEFF/, "");
  const lines = cleanedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("CSV file is empty.");
  }

  const headers = parseCsvLine(lines[0]).map((header) =>
    header.trim().toLowerCase()
  );

  return {
    headers,
    rows: lines.slice(1).map((line, index) => ({
      rowNumber: index + 2,
      values: parseCsvLine(line),
    })),
  };
}

function getColumn(headers: string[], values: string[], columnName: string) {
  const index = headers.indexOf(columnName.toLowerCase());

  if (index === -1) {
    return "";
  }

  return values[index] || "";
}

function parseTeamsCsv(csvText: string) {
  const { headers, rows } = parseCsv(csvText);

  if (!headers.includes("name")) {
    throw new Error('Teams CSV must include a "name" column.');
  }

  return rows.map((row) => ({
    rowNumber: row.rowNumber,
    name: getColumn(headers, row.values, "name"),
    shortName: getColumn(headers, row.values, "shortname"),
    logoUrl: getColumn(headers, row.values, "logourl"),
  }));
}

function parsePlayersCsv(csvText: string) {
  const { headers, rows } = parseCsv(csvText);

  if (!headers.includes("name")) {
    throw new Error('Players CSV must include a "name" column.');
  }

  return rows.map((row) => ({
    rowNumber: row.rowNumber,
    name: getColumn(headers, row.values, "name"),
    school: getColumn(headers, row.values, "school"),
    teamName: getColumn(headers, row.values, "teamname"),
    sport: getColumn(headers, row.values, "sport"),
    position: getColumn(headers, row.values, "position"),
    number: getColumn(headers, row.values, "number"),
    dateOfBirth: getColumn(headers, row.values, "dateofbirth"),
    age: getColumn(headers, row.values, "age"),
    country: getColumn(headers, row.values, "country"),
    imageUrl: getColumn(headers, row.values, "imageurl"),
    active: getColumn(headers, row.values, "active") || "true",
  }));
}

function parseFixturesCsv(csvText: string) {
  const { headers, rows } = parseCsv(csvText);

  const requiredColumns = ["hometeam", "awayteam", "matchdate"];

  for (const column of requiredColumns) {
    if (!headers.includes(column)) {
      throw new Error(`Fixtures CSV must include a "${column}" column.`);
    }
  }

  return rows.map((row) => ({
    rowNumber: row.rowNumber,
    homeTeam: getColumn(headers, row.values, "hometeam"),
    awayTeam: getColumn(headers, row.values, "awayteam"),
    sport: getColumn(headers, row.values, "sport") || "Football",
    communityName:
      getColumn(headers, row.values, "communityname") || "Derby Day",
    competition: getColumn(headers, row.values, "competition"),
    venue: getColumn(headers, row.values, "venue"),
    matchDate: getColumn(headers, row.values, "matchdate"),
    status: getColumn(headers, row.values, "status") || "upcoming",
    homeScore: getColumn(headers, row.values, "homescore") || "0",
    awayScore: getColumn(headers, row.values, "awayscore") || "0",
    isStreamed: getColumn(headers, row.values, "isstreamed") || "false",
    streamId: getColumn(headers, row.values, "streamid"),
  }));
}

function validateUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return true;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateIntegerString(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return true;
  }

  return /^\d+$/.test(trimmed);
}

function validateScoreString(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return true;
  }

  return /^-?\d+$/.test(trimmed);
}

function validateDateString(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  const date = new Date(trimmed);

  return !Number.isNaN(date.getTime());
}

function parseBoolean(value: string, defaultValue = false) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) return defaultValue;

  return ["true", "yes", "1", "active", "streamed"].includes(normalized);
}

function parseActive(value: string) {
  return parseBoolean(value, true);
}

function parseFixtureStatus(value: string): FixtureStatus {
  const normalized = value.trim().toLowerCase();

  if (
    normalized === "live" ||
    normalized === "completed" ||
    normalized === "cancelled" ||
    normalized === "hidden"
  ) {
    return normalized;
  }

  return "upcoming";
}

function getFixtureDuplicateKey(row: {
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  competition: string;
}) {
  return [
    normalizeText(row.homeTeam),
    normalizeText(row.awayTeam),
    normalizeDateKey(row.matchDate),
    normalizeText(row.competition),
  ].join("|");
}

function getStatusClass(status: ImportStatus) {
  if (status === "ready") return "bg-green-100 text-green-700";
  if (status === "duplicate") return "bg-yellow-100 text-yellow-700";
  if (status === "invalid") return "bg-red-100 text-red-700";
  if (status === "imported") return "bg-blue-100 text-blue-700";
  if (status === "failed") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-600";
}

function downloadTemplate(mode: ImportMode) {
  const csv =
    mode === "teams"
      ? [
          "name,shortName,logoUrl",
          "Prince Edward,PE,",
          "St George's College,STG,",
          "Churchill School,CHS,",
        ].join("\n")
      : mode === "players"
      ? [
          "name,school,teamName,sport,position,number,dateOfBirth,age,country,imageUrl,active",
          "Tinashe Moyo,Prince Edward,Prince Edward,Football,Forward,10,2008-05-12,17,Zimbabwe,,true",
          "Kuda Nyoni,St George's College,St George's College,Football,Midfielder,8,2008-09-20,17,Zimbabwe,,true",
        ].join("\n")
      : [
          "homeTeam,awayTeam,sport,communityName,competition,venue,matchDate,status,homeScore,awayScore,isStreamed,streamId",
          "Prince Edward,St George's College,Football,Derby Day,Schools League,PE Main Field,2026-07-10T15:00:00.000Z,upcoming,0,0,false,",
          "Churchill School,Peterhouse,Football,Derby Day,Schools League,Churchill Main Field,2026-07-17T15:00:00.000Z,upcoming,0,0,false,",
        ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download =
    mode === "teams"
      ? "sportsai_teams_import_template.csv"
      : mode === "players"
      ? "sportsai_players_import_template.csv"
      : "sportsai_fixtures_import_template.csv";
  anchor.click();

  URL.revokeObjectURL(url);
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "green" | "yellow" | "red" | "blue";
}) {
  const toneClass =
    tone === "green"
      ? "text-green-600"
      : tone === "yellow"
      ? "text-yellow-600"
      : tone === "red"
      ? "text-red-600"
      : tone === "blue"
      ? "text-blue-600"
      : "";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold uppercase text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<ImportMode>("teams");
  const [teamRows, setTeamRows] = useState<TeamImportRow[]>([]);
  const [playerRows, setPlayerRows] = useState<PlayerImportRow[]>([]);
  const [fixtureRows, setFixtureRows] = useState<FixtureImportRow[]>([]);
  const [existingTeams, setExistingTeams] = useState<CmsTeam[]>([]);
  const [existingPlayers, setExistingPlayers] = useState<CmsPlayer[]>([]);
  const [existingFixtures, setExistingFixtures] = useState<CmsFixture[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const rows =
    mode === "teams" ? teamRows : mode === "players" ? playerRows : fixtureRows;

  const summary = useMemo(() => {
    return {
      total: rows.length,
      ready: rows.filter((row: any) =>
        mode === "fixtures"
          ? row.statusResult === "ready"
          : row.status === "ready"
      ).length,
      duplicate: rows.filter((row: any) =>
        mode === "fixtures"
          ? row.statusResult === "duplicate"
          : row.status === "duplicate"
      ).length,
      invalid: rows.filter((row: any) =>
        mode === "fixtures"
          ? row.statusResult === "invalid"
          : row.status === "invalid"
      ).length,
      imported: rows.filter((row: any) =>
        mode === "fixtures"
          ? row.statusResult === "imported"
          : row.status === "imported"
      ).length,
      failed: rows.filter((row: any) =>
        mode === "fixtures"
          ? row.statusResult === "failed"
          : row.status === "failed"
      ).length,
    };
  }, [rows, mode]);

  async function loadExistingTeams() {
    const teams = await getCmsTeams();
    setExistingTeams(teams);
    return teams;
  }

  async function loadExistingPlayers() {
    const players = await getCmsPlayers();
    setExistingPlayers(players);
    return players;
  }

  async function loadExistingFixtures() {
    const fixtures = await getCmsFixtures();
    setExistingFixtures(fixtures);
    return fixtures;
  }

  function validateTeamRows(
    parsedRows: Array<{
      rowNumber: number;
      name: string;
      shortName: string;
      logoUrl: string;
    }>,
    teams: CmsTeam[]
  ) {
    const existingNames = new Set(
      teams.map((team) => normalizeText(team.name || ""))
    );
    const seenNames = new Set<string>();

    return parsedRows.map((row) => {
      const normalizedName = normalizeText(row.name);

      if (!row.name.trim()) {
        return {
          ...row,
          status: "invalid" as ImportStatus,
          message: "Missing team name.",
        };
      }

      if (!validateUrl(row.logoUrl)) {
        return {
          ...row,
          status: "invalid" as ImportStatus,
          message: "Logo URL must be a valid http or https URL.",
        };
      }

      if (existingNames.has(normalizedName)) {
        return {
          ...row,
          status: "duplicate" as ImportStatus,
          message: "Team already exists in Appwrite.",
        };
      }

      if (seenNames.has(normalizedName)) {
        return {
          ...row,
          status: "duplicate" as ImportStatus,
          message: "Duplicate team name in this CSV.",
        };
      }

      seenNames.add(normalizedName);

      return {
        ...row,
        status: "ready" as ImportStatus,
        message: "Ready to import.",
      };
    });
  }

  function validatePlayerRows(
    parsedRows: Array<{
      rowNumber: number;
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
      active: string;
    }>,
    players: CmsPlayer[]
  ) {
    const existingKeys = new Set(
      players.map((player) =>
        [
          normalizeText(player.name || ""),
          normalizeText(player.teamName || ""),
          normalizeText(player.school || ""),
        ].join("|")
      )
    );
    const seenKeys = new Set<string>();

    return parsedRows.map((row) => {
      const key = [
        normalizeText(row.name),
        normalizeText(row.teamName),
        normalizeText(row.school),
      ].join("|");

      if (!row.name.trim()) {
        return {
          ...row,
          status: "invalid" as ImportStatus,
          message: "Missing player name.",
        };
      }

      if (!validateIntegerString(row.number)) {
        return {
          ...row,
          status: "invalid" as ImportStatus,
          message: "Number must be a whole number.",
        };
      }

      if (!validateIntegerString(row.age)) {
        return {
          ...row,
          status: "invalid" as ImportStatus,
          message: "Age must be a whole number.",
        };
      }

      if (row.dateOfBirth.trim() && !validateDateString(row.dateOfBirth)) {
        return {
          ...row,
          status: "invalid" as ImportStatus,
          message: "Date of birth must be a valid date.",
        };
      }

      if (!validateUrl(row.imageUrl)) {
        return {
          ...row,
          status: "invalid" as ImportStatus,
          message: "Image URL must be a valid http or https URL.",
        };
      }

      if (existingKeys.has(key)) {
        return {
          ...row,
          status: "duplicate" as ImportStatus,
          message: "Player already exists in Appwrite.",
        };
      }

      if (seenKeys.has(key)) {
        return {
          ...row,
          status: "duplicate" as ImportStatus,
          message: "Duplicate player in this CSV.",
        };
      }

      seenKeys.add(key);

      return {
        ...row,
        status: "ready" as ImportStatus,
        message: "Ready to import.",
      };
    });
  }

  function validateFixtureRows(
    parsedRows: Array<{
      rowNumber: number;
      homeTeam: string;
      awayTeam: string;
      sport: string;
      communityName: string;
      competition: string;
      venue: string;
      matchDate: string;
      status: string;
      homeScore: string;
      awayScore: string;
      isStreamed: string;
      streamId: string;
    }>,
    fixtures: CmsFixture[]
  ) {
    const existingKeys = new Set(
      fixtures.map((fixture) =>
        getFixtureDuplicateKey({
          homeTeam: fixture.homeTeam || "",
          awayTeam: fixture.awayTeam || "",
          matchDate: fixture.matchDate || "",
          competition: fixture.competition || "",
        })
      )
    );
    const seenKeys = new Set<string>();

    return parsedRows.map((row) => {
      const key = getFixtureDuplicateKey(row);

      if (!row.homeTeam.trim()) {
        return {
          ...row,
          statusResult: "invalid" as ImportStatus,
          message: "Missing home team.",
        };
      }

      if (!row.awayTeam.trim()) {
        return {
          ...row,
          statusResult: "invalid" as ImportStatus,
          message: "Missing away team.",
        };
      }

      if (normalizeText(row.homeTeam) === normalizeText(row.awayTeam)) {
        return {
          ...row,
          statusResult: "invalid" as ImportStatus,
          message: "Home team and away team cannot be the same.",
        };
      }

      if (!validateDateString(row.matchDate)) {
        return {
          ...row,
          statusResult: "invalid" as ImportStatus,
          message: "Match date must be a valid date.",
        };
      }

      if (!validateScoreString(row.homeScore)) {
        return {
          ...row,
          statusResult: "invalid" as ImportStatus,
          message: "Home score must be a whole number.",
        };
      }

      if (!validateScoreString(row.awayScore)) {
        return {
          ...row,
          statusResult: "invalid" as ImportStatus,
          message: "Away score must be a whole number.",
        };
      }

      if (existingKeys.has(key)) {
        return {
          ...row,
          statusResult: "duplicate" as ImportStatus,
          message: "Fixture already exists in Appwrite.",
        };
      }

      if (seenKeys.has(key)) {
        return {
          ...row,
          statusResult: "duplicate" as ImportStatus,
          message: "Duplicate fixture in this CSV.",
        };
      }

      seenKeys.add(key);

      return {
        ...row,
        statusResult: "ready" as ImportStatus,
        message: "Ready to import.",
      };
    });
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setLoading(true);

      const text = await file.text();

      if (mode === "teams") {
        const parsedRows = parseTeamsCsv(text);
        const teams = await loadExistingTeams();

        setTeamRows(validateTeamRows(parsedRows, teams));
      } else if (mode === "players") {
        const parsedRows = parsePlayersCsv(text);
        const players = await loadExistingPlayers();

        setPlayerRows(validatePlayerRows(parsedRows, players));
      } else {
        const parsedRows = parseFixturesCsv(text);
        const fixtures = await loadExistingFixtures();

        setFixtureRows(validateFixtureRows(parsedRows, fixtures));
      }
    } catch (error: any) {
      console.error("CSV parse error:", error);
      alert(error?.message || "Could not read CSV file.");
    } finally {
      setLoading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleRefreshValidation() {
    try {
      setLoading(true);

      if (mode === "teams") {
        const teams = await loadExistingTeams();
        setTeamRows((currentRows) => validateTeamRows(currentRows, teams));
      } else if (mode === "players") {
        const players = await loadExistingPlayers();
        setPlayerRows((currentRows) =>
          validatePlayerRows(currentRows, players)
        );
      } else {
        const fixtures = await loadExistingFixtures();
        setFixtureRows((currentRows) =>
          validateFixtureRows(currentRows, fixtures)
        );
      }
    } catch (error: any) {
      console.error("Refresh validation error:", error);
      alert(error?.message || "Could not refresh validation.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImportTeams() {
    const readyRows = teamRows.filter((row) => row.status === "ready");

    if (readyRows.length === 0) {
      alert("No ready team rows to import.");
      return;
    }

    if (!window.confirm(`Import ${readyRows.length} teams?`)) {
      return;
    }

    try {
      setImporting(true);

      for (const row of readyRows) {
        try {
          await createCmsTeam({
            name: row.name,
            shortName: row.shortName,
            logoUrl: row.logoUrl,
          });

          setTeamRows((currentRows) =>
            currentRows.map((currentRow) =>
              currentRow.rowNumber === row.rowNumber
                ? {
                    ...currentRow,
                    status: "imported",
                    message: "Imported successfully.",
                  }
                : currentRow
            )
          );
        } catch (error: any) {
          setTeamRows((currentRows) =>
            currentRows.map((currentRow) =>
              currentRow.rowNumber === row.rowNumber
                ? {
                    ...currentRow,
                    status: "failed",
                    message:
                      error?.message ||
                      error?.response?.message ||
                      "Import failed.",
                  }
                : currentRow
            )
          );
        }
      }

      await loadExistingTeams();
    } finally {
      setImporting(false);
    }
  }

  async function handleImportPlayers() {
    const readyRows = playerRows.filter((row) => row.status === "ready");

    if (readyRows.length === 0) {
      alert("No ready player rows to import.");
      return;
    }

    if (!window.confirm(`Import ${readyRows.length} players?`)) {
      return;
    }

    try {
      setImporting(true);

      for (const row of readyRows) {
        try {
          await createCmsPlayer({
            name: row.name,
            school: row.school,
            teamName: row.teamName,
            sport: row.sport,
            position: row.position,
            number: row.number,
            dateOfBirth: row.dateOfBirth,
            age: row.age,
            country: row.country,
            imageUrl: row.imageUrl,
            active: parseActive(row.active),
          });

          setPlayerRows((currentRows) =>
            currentRows.map((currentRow) =>
              currentRow.rowNumber === row.rowNumber
                ? {
                    ...currentRow,
                    status: "imported",
                    message: "Imported successfully.",
                  }
                : currentRow
            )
          );
        } catch (error: any) {
          setPlayerRows((currentRows) =>
            currentRows.map((currentRow) =>
              currentRow.rowNumber === row.rowNumber
                ? {
                    ...currentRow,
                    status: "failed",
                    message:
                      error?.message ||
                      error?.response?.message ||
                      "Import failed.",
                  }
                : currentRow
            )
          );
        }
      }

      await loadExistingPlayers();
    } finally {
      setImporting(false);
    }
  }

  async function handleImportFixtures() {
    const readyRows = fixtureRows.filter(
      (row) => row.statusResult === "ready"
    );

    if (readyRows.length === 0) {
      alert("No ready fixture rows to import.");
      return;
    }

    if (!window.confirm(`Import ${readyRows.length} fixtures?`)) {
      return;
    }

    try {
      setImporting(true);

      for (const row of readyRows) {
        try {
          await createCmsFixture({
            homeTeam: row.homeTeam,
            awayTeam: row.awayTeam,
            sport: row.sport,
            communityName: row.communityName,
            competition: row.competition,
            venue: row.venue,
            matchDate: row.matchDate,
            status: parseFixtureStatus(row.status),
            homeScore: row.homeScore,
            awayScore: row.awayScore,
            isStreamed: parseBoolean(row.isStreamed, false),
            streamId: row.streamId,
          });

          setFixtureRows((currentRows) =>
            currentRows.map((currentRow) =>
              currentRow.rowNumber === row.rowNumber
                ? {
                    ...currentRow,
                    statusResult: "imported",
                    message: "Imported successfully.",
                  }
                : currentRow
            )
          );
        } catch (error: any) {
          setFixtureRows((currentRows) =>
            currentRows.map((currentRow) =>
              currentRow.rowNumber === row.rowNumber
                ? {
                    ...currentRow,
                    statusResult: "failed",
                    message:
                      error?.message ||
                      error?.response?.message ||
                      "Import failed.",
                  }
                : currentRow
            )
          );
        }
      }

      await loadExistingFixtures();
    } finally {
      setImporting(false);
    }
  }

  async function handleImportReadyRows() {
    if (mode === "teams") {
      await handleImportTeams();
      return;
    }

    if (mode === "players") {
      await handleImportPlayers();
      return;
    }

    await handleImportFixtures();
  }

  function renderModeDescription() {
    if (mode === "teams") {
      return (
        <>
          Required column: <strong>name</strong>. Optional columns:
          <strong> shortName</strong> and <strong>logoUrl</strong>. Duplicates
          are skipped by team name.
        </>
      );
    }

    if (mode === "players") {
      return (
        <>
          Required column: <strong>name</strong>. Optional columns:
          <strong> school</strong>, <strong>teamName</strong>,{" "}
          <strong>sport</strong>, <strong>position</strong>,{" "}
          <strong>number</strong>, <strong>dateOfBirth</strong>,{" "}
          <strong>age</strong>, <strong>country</strong>,{" "}
          <strong>imageUrl</strong>, and <strong>active</strong>.
        </>
      );
    }

    return (
      <>
        Required columns: <strong>homeTeam</strong>, <strong>awayTeam</strong>,{" "}
        and <strong>matchDate</strong>. Optional columns include{" "}
        <strong>sport</strong>, <strong>communityName</strong>,{" "}
        <strong>competition</strong>, <strong>venue</strong>,{" "}
        <strong>status</strong>, <strong>homeScore</strong>,{" "}
        <strong>awayScore</strong>, <strong>isStreamed</strong>, and{" "}
        <strong>streamId</strong>.
      </>
    );
  }

  function renderPreviewTable() {
    if (rows.length === 0) {
      return (
        <div className="p-8 text-slate-500">
          Upload a {mode} CSV to preview rows.
        </div>
      );
    }

    if (mode === "teams") {
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm font-bold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-4">Row</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Short Name</th>
                <th className="px-5 py-4">Logo URL</th>
                <th className="px-5 py-4">Message</th>
              </tr>
            </thead>

            <tbody>
              {teamRows.map((row) => (
                <tr key={row.rowNumber} className="border-t border-slate-100">
                  <td className="px-5 py-4 font-bold">{row.rowNumber}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${getStatusClass(
                        row.status
                      )}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold">{row.name}</td>
                  <td className="px-5 py-4">{row.shortName}</td>
                  <td className="max-w-[260px] truncate px-5 py-4 text-sm text-slate-500">
                    {row.logoUrl}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {row.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (mode === "players") {
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm font-bold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-4">Row</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">School</th>
                <th className="px-5 py-4">Team</th>
                <th className="px-5 py-4">Sport</th>
                <th className="px-5 py-4">Position</th>
                <th className="px-5 py-4">No.</th>
                <th className="px-5 py-4">Age</th>
                <th className="px-5 py-4">Active</th>
                <th className="px-5 py-4">Message</th>
              </tr>
            </thead>

            <tbody>
              {playerRows.map((row) => (
                <tr key={row.rowNumber} className="border-t border-slate-100">
                  <td className="px-5 py-4 font-bold">{row.rowNumber}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${getStatusClass(
                        row.status
                      )}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold">{row.name}</td>
                  <td className="px-5 py-4">{row.school}</td>
                  <td className="px-5 py-4">{row.teamName}</td>
                  <td className="px-5 py-4">{row.sport}</td>
                  <td className="px-5 py-4">{row.position}</td>
                  <td className="px-5 py-4">{row.number}</td>
                  <td className="px-5 py-4">{row.age}</td>
                  <td className="px-5 py-4">{row.active || "true"}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {row.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1500px] border-collapse">
          <thead className="bg-slate-50">
            <tr className="text-left text-sm font-bold uppercase tracking-wide text-slate-400">
              <th className="px-5 py-4">Row</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Home</th>
              <th className="px-5 py-4">Away</th>
              <th className="px-5 py-4">Sport</th>
              <th className="px-5 py-4">Community</th>
              <th className="px-5 py-4">Competition</th>
              <th className="px-5 py-4">Venue</th>
              <th className="px-5 py-4">Match Date</th>
              <th className="px-5 py-4">Fixture Status</th>
              <th className="px-5 py-4">Score</th>
              <th className="px-5 py-4">Streamed</th>
              <th className="px-5 py-4">Message</th>
            </tr>
          </thead>

          <tbody>
            {fixtureRows.map((row) => (
              <tr key={row.rowNumber} className="border-t border-slate-100">
                <td className="px-5 py-4 font-bold">{row.rowNumber}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${getStatusClass(
                      row.statusResult
                    )}`}
                  >
                    {row.statusResult}
                  </span>
                </td>
                <td className="px-5 py-4 font-bold">{row.homeTeam}</td>
                <td className="px-5 py-4 font-bold">{row.awayTeam}</td>
                <td className="px-5 py-4">{row.sport}</td>
                <td className="px-5 py-4">{row.communityName}</td>
                <td className="px-5 py-4">{row.competition}</td>
                <td className="px-5 py-4">{row.venue}</td>
                <td className="px-5 py-4">{row.matchDate}</td>
                <td className="px-5 py-4">{row.status}</td>
                <td className="px-5 py-4">
                  {row.homeScore || "0"} - {row.awayScore || "0"}
                </td>
                <td className="px-5 py-4">{row.isStreamed || "false"}</td>
                <td className="px-5 py-4 text-sm text-slate-500">
                  {row.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] text-[#29496d]">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-8 py-6">
            <div>
              <Link
                href="/"
                className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-4xl font-bold">Bulk Import</h1>

              <p className="mt-2 text-slate-500">
                Upload CSV files and import CMS content safely.
              </p>
            </div>

            <CmsLogoutButton />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setMode("teams")}
              className={`rounded px-5 py-4 font-bold transition ${
                mode === "teams"
                  ? "bg-cyan-500 text-white"
                  : "border border-slate-200 bg-white text-[#29496d] hover:bg-slate-50"
              }`}
            >
              Teams Import
            </button>

            <button
              type="button"
              onClick={() => setMode("players")}
              className={`rounded px-5 py-4 font-bold transition ${
                mode === "players"
                  ? "bg-cyan-500 text-white"
                  : "border border-slate-200 bg-white text-[#29496d] hover:bg-slate-50"
              }`}
            >
              Players Import
            </button>

            <button
              type="button"
              onClick={() => setMode("fixtures")}
              className={`rounded px-5 py-4 font-bold transition ${
                mode === "fixtures"
                  ? "bg-cyan-500 text-white"
                  : "border border-slate-200 bg-white text-[#29496d] hover:bg-slate-50"
              }`}
            >
              Fixtures Import
            </button>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[3px] text-cyan-600">
                  {mode === "teams"
                    ? "Teams Import"
                    : mode === "players"
                    ? "Players Import"
                    : "Fixtures Import"}
                </p>

                <h2 className="mt-3 text-3xl font-bold">
                  {mode === "teams"
                    ? "Import teams from CSV"
                    : mode === "players"
                    ? "Import players from CSV"
                    : "Import fixtures from CSV"}
                </h2>

                <p className="mt-3 max-w-4xl text-lg leading-8 text-slate-500">
                  {renderModeDescription()}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => downloadTemplate(mode)}
                  className="rounded border border-slate-200 bg-white px-5 py-4 font-bold text-[#29496d] transition hover:bg-slate-50"
                >
                  Download Template
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || importing}
                  className="rounded bg-cyan-500 px-6 py-4 font-bold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Reading..."
                    : mode === "teams"
                    ? "Upload Teams CSV"
                    : mode === "players"
                    ? "Upload Players CSV"
                    : "Upload Fixtures CSV"}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelected}
              className="hidden"
            />
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3 xl:grid-cols-6">
            <SummaryCard label="Rows" value={summary.total} />
            <SummaryCard label="Ready" value={summary.ready} tone="green" />
            <SummaryCard
              label="Duplicates"
              value={summary.duplicate}
              tone="yellow"
            />
            <SummaryCard label="Invalid" value={summary.invalid} tone="red" />
            <SummaryCard label="Imported" value={summary.imported} tone="blue" />
            <SummaryCard label="Failed" value={summary.failed} tone="red" />
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleRefreshValidation}
              disabled={rows.length === 0 || loading || importing}
              className="rounded border border-slate-200 bg-white px-5 py-4 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh Validation
            </button>

            <button
              type="button"
              onClick={handleImportReadyRows}
              disabled={summary.ready === 0 || importing}
              className="rounded bg-green-600 px-6 py-4 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing
                ? "Importing..."
                : `Import ${summary.ready} Ready ${
                    mode === "teams"
                      ? "Teams"
                      : mode === "players"
                      ? "Players"
                      : "Fixtures"
                  }`}
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            {renderPreviewTable()}
          </div>
        </section>
      </main>
    </CmsAuthGuard>
  );
}
