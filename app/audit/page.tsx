"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  CmsAuditLog,
  deleteCmsAuditLog,
  getCmsAuditLogs,
} from "@/lib/cms";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function formatDate(value?: string) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function actionBadgeClass(action: string) {
  if (action === "create") return "bg-green-100 text-green-700";
  if (action === "update") return "bg-blue-100 text-blue-700";
  if (action === "delete") return "bg-red-100 text-red-700";
  if (action === "score") return "bg-purple-100 text-purple-700";
  if (action === "upload") return "bg-orange-100 text-orange-700";

  return "bg-slate-100 text-slate-600";
}

export default function AuditPage() {
  const [logs, setLogs] = useState<CmsAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadLogs() {
    try {
      setLoading(true);
      setLogs(await getCmsAuditLogs());
    } catch (error: any) {
      console.error("Audit log load error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not load audit logs."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return logs;

    return logs.filter((log) =>
      [
        log.action,
        log.entityType,
        log.entityId,
        log.entityTitle,
        log.message,
        log.actor,
        log.metadata,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [logs, search]);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this audit log entry?")) {
      return;
    }

    try {
      await deleteCmsAuditLog(id);
      await loadLogs();
    } catch (error: any) {
      console.error("Delete audit log error:", error);
      alert(error?.message || "Could not delete audit log.");
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

              <h1 className="mt-2 text-4xl font-bold">Audit Log</h1>

              <p className="mt-2 text-slate-500">
                Review recent CMS actions and content changes.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadLogs}
                className="rounded border border-slate-200 bg-white px-5 py-4 font-bold text-[#29496d] transition hover:bg-slate-50"
              >
                Refresh
              </button>

              <CmsLogoutButton />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <label className="text-sm font-bold uppercase tracking-wide text-slate-400">
              Search audit logs
            </label>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by action, entity, message, ID or actor..."
              className="mt-3 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
            />
          </div>

          {loading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              Loading audit logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              No audit logs found.
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.$id}
                  className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${actionBadgeClass(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                          {log.entityType || "entity"}
                        </span>

                        <span className="text-sm text-slate-400">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>

                      <h2 className="mt-3 text-xl font-bold text-[#29496d]">
                        {log.message}
                      </h2>

                      {log.entityTitle ? (
                        <p className="mt-1 text-slate-500">
                          {log.entityTitle}
                        </p>
                      ) : null}

                      <div className="mt-3 grid gap-1 text-sm text-slate-400">
                        <p>Actor: {log.actor || "cms"}</p>
                        {log.entityId ? <p>Entity ID: {log.entityId}</p> : null}
                        {log.metadata ? (
                          <p className="break-all">Metadata: {log.metadata}</p>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(log.$id)}
                      className="rounded border border-red-200 bg-white px-4 py-3 font-bold text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </CmsAuthGuard>
  );
}
