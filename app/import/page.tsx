"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import { CmsTeam, createCmsTeam, getCmsTeams } from "@/lib/cms";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type ImportStatus = "ready" | "duplicate" | "invalid" | "imported" | "failed";

type TeamImportRow = {
  rowNumber: number;
  name: string;
  shortName: string;
  logoUrl: string;
  status: ImportStatus;
  message: string;
};

function normalizeTeamName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
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

  const nameIndex = headers.indexOf("name");
  const shortNameIndex = headers.indexOf("shortname");
  const logoUrlIndex = headers.indexOf("logourl");

  if (nameIndex === -1) {
    throw new Error('CSV must include a "name" column.');
  }

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);

    return {
      rowNumber: index + 2,
      name: values[nameIndex] || "",
      shortName: shortNameIndex >= 0 ? values[shortNameIndex] || "" : "",
      logoUrl: logoUrlIndex >= 0 ? values[logoUrlIndex] || "" : "",
    };
  });
}

function validateLogoUrl(value: string) {
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

function getStatusClass(status: ImportStatus) {
  if (status === "ready") return "bg-green-100 text-green-700";
  if (status === "duplicate") return "bg-yellow-100 text-yellow-700";
  if (status === "invalid") return "bg-red-100 text-red-700";
  if (status === "imported") return "bg-blue-100 text-blue-700";
  if (status === "failed") return "bg-red-100 text-red-700";

  return "bg-slate-100 text-slate-600";
}

function downloadTemplate() {
  const csv = [
    "name,shortName,logoUrl",
    "Prince Edward,PE,",
    "St George's College,STG,",
    "Churchill School,CHS,",
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "sportsai_teams_import_template.csv";
  anchor.click();

  URL.revokeObjectURL(url);
}

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [rows, setRows] = useState<TeamImportRow[]>([]);
  const [existingTeams, setExistingTeams] = useState<CmsTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const summary = useMemo(() => {
    return {
      total: rows.length,
      ready: rows.filter((row) => row.status === "ready").length,
      duplicate: rows.filter((row) => row.status === "duplicate").length,
      invalid: rows.filter((row) => row.status === "invalid").length,
      imported: rows.filter((row) => row.status === "imported").length,
      failed: rows.filter((row) => row.status === "failed").length,
    };
  }, [rows]);

  async function loadExistingTeams() {
    const teams = await getCmsTeams();
    setExistingTeams(teams);
    return teams;
  }

  function validateRows(
    parsedRows: Array<{
      rowNumber: number;
      name: string;
      shortName: string;
      logoUrl: string;
    }>,
    teams: CmsTeam[]
  ) {
    const existingNames = new Set(
      teams.map((team) => normalizeTeamName(team.name || ""))
    );
    const seenNames = new Set<string>();

    return parsedRows.map((row) => {
      const normalizedName = normalizeTeamName(row.name);

      if (!row.name.trim()) {
        return {
          ...row,
          status: "invalid" as ImportStatus,
          message: "Missing team name.",
        };
      }

      if (!validateLogoUrl(row.logoUrl)) {
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

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setLoading(true);

      const text = await file.text();
      const parsedRows = parseCsv(text);
      const teams = await loadExistingTeams();

      setRows(validateRows(parsedRows, teams));
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
      const teams = await loadExistingTeams();

      setRows((currentRows) => validateRows(currentRows, teams));
    } catch (error: any) {
      console.error("Refresh validation error:", error);
      alert(error?.message || "Could not refresh validation.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImportReadyRows() {
    const readyRows = rows.filter((row) => row.status === "ready");

    if (readyRows.length === 0) {
      alert("No ready rows to import.");
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

          setRows((currentRows) =>
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
          console.error("Team import row error:", row, error);

          setRows((currentRows) =>
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
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[3px] text-cyan-600">
                  Teams Import
                </p>

                <h2 className="mt-3 text-3xl font-bold">
                  Import teams from CSV
                </h2>

                <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-500">
                  Required column: <strong>name</strong>. Optional columns:
                  <strong> shortName</strong> and <strong>logoUrl</strong>.
                  Duplicates are skipped by team name.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={downloadTemplate}
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
                  {loading ? "Reading..." : "Upload Teams CSV"}
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
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold uppercase text-slate-400">Rows</p>
              <p className="mt-2 text-3xl font-bold">{summary.total}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold uppercase text-slate-400">Ready</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {summary.ready}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold uppercase text-slate-400">
                Duplicates
              </p>
              <p className="mt-2 text-3xl font-bold text-yellow-600">
                {summary.duplicate}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold uppercase text-slate-400">
                Invalid
              </p>
              <p className="mt-2 text-3xl font-bold text-red-600">
                {summary.invalid}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold uppercase text-slate-400">
                Imported
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {summary.imported}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold uppercase text-slate-400">
                Failed
              </p>
              <p className="mt-2 text-3xl font-bold text-red-600">
                {summary.failed}
              </p>
            </div>
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
              {importing ? "Importing..." : `Import ${summary.ready} Ready Teams`}
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            {rows.length === 0 ? (
              <div className="p-8 text-slate-500">
                Upload a teams CSV to preview rows.
              </div>
            ) : (
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
                    {rows.map((row) => (
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
            )}
          </div>
        </section>
      </main>
    </CmsAuthGuard>
  );
}
