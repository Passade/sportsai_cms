"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsLogoutButton from "@/components/cms-logout-button";
import {
  getCmsErrorMessage,
  useCmsToast,
} from "@/components/cms-toast-provider";
import {
  CmsFixtureChat,
  clearCmsFixtureChatReactions,
  deleteCmsFixtureChat,
  getCmsFixtureChatsPage,
  setCmsFixtureChatHidden,
  updateCmsFixtureChat,
} from "@/lib/cms";
import Link from "next/link";
import { useMemo, useState } from "react";

type ChatDraft = {
  userName: string;
  message: string;
  replyToUserName: string;
  replyToMessage: string;
  reactions: string;
};

const PAGE_SIZE = 25;

function formatDate(value?: string) {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function buildDraft(chat: CmsFixtureChat): ChatDraft {
  return {
    userName: chat.userName || "",
    message: chat.message || "",
    replyToUserName: chat.replyToUserName || "",
    replyToMessage: chat.replyToMessage || "",
    reactions: chat.reactions || "{}",
  };
}

function getReactionSummary(reactions?: string) {
  if (!reactions || reactions === "{}") return "No reactions";

  try {
    const parsed = JSON.parse(reactions);
    const entries = Object.entries(parsed);

    if (entries.length === 0) return "No reactions";

    return entries.map(([emoji, count]) => `${emoji} ${count}`).join("  ");
  } catch {
    return reactions;
  }
}

function buildDraftMap(chats: CmsFixtureChat[]) {
  const nextDrafts: Record<string, ChatDraft> = {};

  chats.forEach((chat) => {
    nextDrafts[chat.$id] = buildDraft(chat);
  });

  return nextDrafts;
}

export default function ChatsAdminPage() {
  const { showSuccess, showError, showWarning } = useCmsToast();

  const [chats, setChats] = useState<CmsFixtureChat[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ChatDraft>>({});
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [fixtureFilter, setFixtureFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<
    "all" | "visible" | "hidden"
  >("all");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previousCursor, setPreviousCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [lastLoadedScope, setLastLoadedScope] = useState<"fixture" | "latest" | null>(
    null
  );

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return chats;
    }

    return chats.filter((chat) => {
      return [
        chat.fixtureId,
        chat.userId,
        chat.userName,
        chat.message,
        chat.replyToMessageId,
        chat.replyToUserName,
        chat.replyToMessage,
        chat.reactions,
        chat.isHidden ? "hidden" : "visible",
        chat.$id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [chats, search]);

  const filteredIds = filteredChats.map((chat) => chat.$id);
  const selectedInFiltered = selectedIds.filter((id) => filteredIds.includes(id));

  const allFilteredSelected =
    filteredChats.length > 0 &&
    filteredChats.every((chat) => selectedIds.includes(chat.$id));

  function resetListState() {
    setChats([]);
    setDrafts({});
    setExpandedIds({});
    setSelectedIds([]);
    setTotal(0);
    setNextCursor(null);
    setPreviousCursor(null);
    setCursorHistory([]);
    setPageNumber(1);
  }

  async function loadChats(options?: {
    cursor?: string;
    direction?: "next" | "previous";
    reset?: boolean;
    allowLatest?: boolean;
  }) {
    const fixtureId = fixtureFilter.trim();

    if (!fixtureId && !options?.allowLatest) {
      showWarning(
        "Fixture ID required",
        "Paste a fixture ID and click Load Fixture Chats. This avoids loading all chats by default."
      );
      return;
    }

    try {
      setLoading(true);

      const result = await getCmsFixtureChatsPage({
        fixtureId: fixtureId || undefined,
        visibility: visibilityFilter,
        cursor: options?.cursor,
        direction: options?.direction,
        limit: PAGE_SIZE,
      });

      setChats(result.documents);
      setDrafts(buildDraftMap(result.documents));
      setSelectedIds([]);
      setExpandedIds({});
      setTotal(result.total);
      setNextCursor(result.nextCursor);
      setPreviousCursor(result.previousCursor);
      setHasLoaded(true);
      setLastLoadedScope(fixtureId ? "fixture" : "latest");

      if (options?.reset) {
        setCursorHistory([]);
        setPageNumber(1);
      }
    } catch (error) {
      console.error("Load fixture chats error:", error);
      showError("Could not load chats", getCmsErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function loadFixtureChats() {
    await loadChats({ reset: true });
  }

  async function loadLatestChats() {
    await loadChats({ reset: true, allowLatest: true });
  }

  async function goToNextPage() {
    if (!nextCursor || loading) return;

    const currentFirstCursor = previousCursor;

    await loadChats({
      cursor: nextCursor,
      direction: "next",
      allowLatest: lastLoadedScope === "latest",
    });

    if (currentFirstCursor) {
      setCursorHistory((current) => [...current, currentFirstCursor]);
    }

    setPageNumber((current) => current + 1);
  }

  async function goToPreviousPage() {
    if (loading || pageNumber <= 1) return;

    const history = [...cursorHistory];
    const cursor = history.pop();

    if (!cursor) {
      await loadChats({
        reset: true,
        allowLatest: lastLoadedScope === "latest",
      });
      return;
    }

    await loadChats({
      cursor,
      direction: "previous",
      allowLatest: lastLoadedScope === "latest",
    });

    setCursorHistory(history);
    setPageNumber((current) => Math.max(1, current - 1));
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedIds((current) =>
        current.filter((selectedId) => !filteredIds.includes(selectedId))
      );
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...filteredIds])));
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) {
      showWarning("No chats selected", "Select at least one chat message first.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected chat message${
        selectedIds.length === 1 ? "" : "s"
      }? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setBulkDeleting(true);

      await Promise.all(selectedIds.map((id) => deleteCmsFixtureChat(id)));

      setChats((currentChats) =>
        currentChats.filter((chat) => !selectedIds.includes(chat.$id))
      );

      setExpandedIds((currentExpanded) => {
        const nextExpanded = { ...currentExpanded };

        selectedIds.forEach((id) => {
          delete nextExpanded[id];
        });

        return nextExpanded;
      });

      setTotal((current) => Math.max(0, current - selectedIds.length));

      showSuccess(
        "Chats deleted",
        `Deleted ${selectedIds.length} selected chat message${
          selectedIds.length === 1 ? "" : "s"
        }.`
      );

      setSelectedIds([]);
    } catch (error) {
      console.error("Bulk delete fixture chats error:", error);
      showError("Could not delete chats", getCmsErrorMessage(error));
    } finally {
      setBulkDeleting(false);
    }
  }

  function updateDraft(id: string, key: keyof ChatDraft, value: string) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [id]: {
        ...(currentDrafts[id] || {
          userName: "",
          message: "",
          replyToUserName: "",
          replyToMessage: "",
          reactions: "{}",
        }),
        [key]: value,
      },
    }));
  }

  async function handleSave(chat: CmsFixtureChat) {
    const draft = drafts[chat.$id];

    if (!draft) {
      showWarning("Nothing to save", "No draft exists for this chat.");
      return;
    }

    if (!draft.message.trim()) {
      showWarning("Message required", "Chat message cannot be empty.");
      return;
    }

    try {
      setSavingId(chat.$id);

      const updated = await updateCmsFixtureChat(chat.$id, draft);

      setChats((currentChats) =>
        currentChats.map((currentChat) =>
          currentChat.$id === chat.$id ? updated : currentChat
        )
      );

      setDrafts((currentDrafts) => ({
        ...currentDrafts,
        [chat.$id]: buildDraft(updated),
      }));

      showSuccess("Chat updated", "The chat message was saved.");
    } catch (error) {
      console.error("Save fixture chat error:", error);
      showError("Could not save chat", getCmsErrorMessage(error));
    } finally {
      setSavingId("");
    }
  }

  async function handleClearReactions(chat: CmsFixtureChat) {
    if (!window.confirm("Clear all reactions for this chat message?")) {
      return;
    }

    try {
      setSavingId(chat.$id);

      const updated = await clearCmsFixtureChatReactions(chat.$id);

      setChats((currentChats) =>
        currentChats.map((currentChat) =>
          currentChat.$id === chat.$id ? updated : currentChat
        )
      );

      setDrafts((currentDrafts) => ({
        ...currentDrafts,
        [chat.$id]: buildDraft(updated),
      }));

      showSuccess("Reactions cleared", "The chat reactions were reset.");
    } catch (error) {
      console.error("Clear chat reactions error:", error);
      showError("Could not clear reactions", getCmsErrorMessage(error));
    } finally {
      setSavingId("");
    }
  }

  async function handleSetHidden(chat: CmsFixtureChat, isHidden: boolean) {
    try {
      setSavingId(chat.$id);

      const updated = await setCmsFixtureChatHidden(chat.$id, isHidden);

      setChats((currentChats) =>
        currentChats.map((currentChat) =>
          currentChat.$id === chat.$id ? updated : currentChat
        )
      );

      setDrafts((currentDrafts) => ({
        ...currentDrafts,
        [chat.$id]: buildDraft(updated),
      }));

      showSuccess(
        isHidden ? "Chat hidden" : "Chat unhidden",
        isHidden
          ? "This chat can now be filtered out in the app."
          : "This chat is visible again."
      );
    } catch (error) {
      console.error("Set chat hidden error:", error);
      showError("Could not update visibility", getCmsErrorMessage(error));
    } finally {
      setSavingId("");
    }
  }

  async function handleDelete(chat: CmsFixtureChat) {
    if (
      !window.confirm(
        `Delete this chat message from ${chat.userName || "this user"}?`
      )
    ) {
      return;
    }

    try {
      setSavingId(chat.$id);

      await deleteCmsFixtureChat(chat.$id);

      setChats((currentChats) =>
        currentChats.filter((currentChat) => currentChat.$id !== chat.$id)
      );

      setTotal((current) => Math.max(0, current - 1));

      showSuccess("Chat deleted", "The chat message was removed.");
    } catch (error) {
      console.error("Delete fixture chat error:", error);
      showError("Could not delete chat", getCmsErrorMessage(error));
    } finally {
      setSavingId("");
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
                prefetch={false}
                className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-4xl font-bold">Fixture Chats</h1>

              <p className="mt-2 text-slate-500">
                Lazy-load chat moderation by fixture instead of loading all chat messages.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (lastLoadedScope === "latest") {
                    loadLatestChats();
                  } else {
                    loadFixtureChats();
                  }
                }}
                disabled={loading || (!fixtureFilter.trim() && lastLoadedScope !== "latest")}
                className="rounded border border-slate-200 bg-white px-5 py-4 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>

              <CmsLogoutButton />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm xl:grid-cols-3">
            <label>
              <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Search loaded chats
              </span>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search current page only..."
                className="mt-3 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
              />
            </label>

            <label>
              <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Fixture ID filter
              </span>

              <div className="mt-3 flex gap-3">
                <input
                  value={fixtureFilter}
                  onChange={(event) => {
                    setFixtureFilter(event.target.value);
                    resetListState();
                    setHasLoaded(false);
                    setLastLoadedScope(null);
                  }}
                  placeholder="Paste fixtureId to load one fixture chat"
                  className="w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                />

                <button
                  type="button"
                  onClick={loadFixtureChats}
                  disabled={loading || !fixtureFilter.trim()}
                  className="rounded bg-cyan-500 px-5 py-3 font-bold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Load
                </button>
              </div>
            </label>

            <label>
              <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Visibility
              </span>

              <div className="mt-3 flex gap-3">
                <select
                  value={visibilityFilter}
                  onChange={(event) => {
                    setVisibilityFilter(
                      event.target.value as "all" | "visible" | "hidden"
                    );
                    resetListState();
                    setHasLoaded(false);
                    setLastLoadedScope(null);
                  }}
                  className="w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                >
                  <option value="all">All messages</option>
                  <option value="visible">Visible only</option>
                  <option value="hidden">Hidden only</option>
                </select>

                <button
                  type="button"
                  onClick={loadLatestChats}
                  disabled={loading}
                  className="rounded border border-slate-200 bg-white px-4 py-3 font-bold text-[#29496d] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Latest 25
                </button>
              </div>
            </label>
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-bold">
                  {hasLoaded
                    ? `Showing ${filteredChats.length} of ${chats.length} loaded chat messages`
                    : "No chats loaded yet"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Open page = 0 chat reads. Load a fixture to fetch {PAGE_SIZE} chats.
                  Use Latest 25 only when you need a global moderation check.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex cursor-pointer items-center gap-3 font-bold text-[#29496d]">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    disabled={!filteredChats.length}
                    className="h-5 w-5 disabled:opacity-50"
                  />

                  Select all visible
                </label>

                <span className="text-sm font-semibold text-slate-500">
                  {selectedIds.length} selected
                  {selectedInFiltered.length !== selectedIds.length
                    ? ` · ${selectedInFiltered.length} visible`
                    : ""}
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  disabled={selectedIds.length === 0 || bulkDeleting}
                  className="rounded border border-slate-200 bg-white px-4 py-3 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.length === 0 || bulkDeleting}
                  className="rounded bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkDeleting ? "Deleting..." : "Delete Selected"}
                </button>
              </div>
            </div>
          </div>

          {!hasLoaded ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-cyan-300 bg-cyan-50 p-8 text-[#29496d] shadow-sm">
              <p className="text-xl font-bold">Load chats only when needed</p>
              <p className="mt-2 text-slate-600">
                Paste a fixture ID and click Load, or click Latest 25 for a small
                global moderation check. This avoids loading hundreds of chat rows on
                page open.
              </p>
            </div>
          ) : loading ? (
            <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              Loading fixture chats...
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
              No chat messages found.
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {filteredChats.map((chat) => {
                const draft = drafts[chat.$id] || buildDraft(chat);
                const expanded = expandedIds[chat.$id];

                return (
                  <article
                    key={chat.$id}
                    className={`rounded-[28px] border bg-white p-6 shadow-sm transition ${
                      selectedIds.includes(chat.$id)
                        ? "border-red-300 ring-2 ring-red-100"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 flex-1 gap-4">
                        <label className="mt-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(chat.$id)}
                            onChange={() => toggleSelected(chat.$id)}
                            className="h-5 w-5"
                            aria-label={`Select chat from ${
                              chat.userName || "unknown user"
                            }`}
                          />
                        </label>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-700">
                              {chat.userName || "Unknown user"}
                            </span>

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                              {formatDate(chat.$createdAt)}
                            </span>

                            {chat.fixtureId ? (
                              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-purple-700">
                                Fixture {chat.fixtureId}
                              </span>
                            ) : null}

                            {chat.isHidden ? (
                              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
                                Hidden
                              </span>
                            ) : (
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-700">
                                Visible
                              </span>
                            )}
                          </div>

                          <p className="mt-4 whitespace-pre-wrap text-lg leading-8 text-[#29496d]">
                            {chat.message || "No message"}
                          </p>

                          {chat.replyToMessage ? (
                            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-sm font-bold text-slate-500">
                                Reply to {chat.replyToUserName || "user"}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {chat.replyToMessage}
                              </p>
                            </div>
                          ) : null}

                          <p className="mt-4 text-sm text-slate-500">
                            Reactions: {getReactionSummary(chat.reactions)}
                          </p>

                          <div className="mt-3 grid gap-1 text-xs text-slate-400">
                            <p>Chat ID: {chat.$id}</p>
                            {chat.userId ? <p>User ID: {chat.userId}</p> : null}
                            {chat.replyToMessageId ? (
                              <p>Reply ID: {chat.replyToMessageId}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedIds((current) => ({
                              ...current,
                              [chat.$id]: !expanded,
                            }))
                          }
                          className="rounded border border-slate-200 bg-white px-4 py-3 font-bold text-[#29496d] hover:bg-slate-50"
                        >
                          {expanded ? "Close Edit" : "Edit"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetHidden(chat, !chat.isHidden)}
                          disabled={savingId === chat.$id || bulkDeleting}
                          className={`rounded border px-4 py-3 font-bold disabled:opacity-50 ${
                            chat.isHidden
                              ? "border-green-200 bg-white text-green-700 hover:bg-green-50"
                              : "border-red-200 bg-white text-red-600 hover:bg-red-50"
                          }`}
                        >
                          {chat.isHidden ? "Unhide" : "Hide"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleClearReactions(chat)}
                          disabled={savingId === chat.$id || bulkDeleting}
                          className="rounded border border-yellow-200 bg-white px-4 py-3 font-bold text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
                        >
                          Clear Reactions
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(chat)}
                          disabled={savingId === chat.$id || bulkDeleting}
                          className="rounded border border-red-200 bg-white px-4 py-3 font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="mt-6 grid gap-5 border-t border-slate-100 pt-6">
                        <label>
                          <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                            User name
                          </span>

                          <input
                            value={draft.userName}
                            onChange={(event) =>
                              updateDraft(chat.$id, "userName", event.target.value)
                            }
                            className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                          />
                        </label>

                        <label>
                          <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                            Message
                          </span>

                          <textarea
                            value={draft.message}
                            onChange={(event) =>
                              updateDraft(chat.$id, "message", event.target.value)
                            }
                            rows={4}
                            className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                          />
                        </label>

                        <div className="grid gap-5 xl:grid-cols-2">
                          <label>
                            <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                              Reply to user name
                            </span>

                            <input
                              value={draft.replyToUserName}
                              onChange={(event) =>
                                updateDraft(
                                  chat.$id,
                                  "replyToUserName",
                                  event.target.value
                                )
                              }
                              className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                            />
                          </label>

                          <label>
                            <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                              Reactions JSON
                            </span>

                            <input
                              value={draft.reactions}
                              onChange={(event) =>
                                updateDraft(chat.$id, "reactions", event.target.value)
                              }
                              className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                            />
                          </label>
                        </div>

                        <label>
                          <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                            Reply message
                          </span>

                          <textarea
                            value={draft.replyToMessage}
                            onChange={(event) =>
                              updateDraft(
                                chat.$id,
                                "replyToMessage",
                                event.target.value
                              )
                            }
                            rows={3}
                            className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                          />
                        </label>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSave(chat)}
                            disabled={savingId === chat.$id || bulkDeleting}
                            className="rounded bg-cyan-500 px-6 py-4 font-bold text-white hover:bg-cyan-600 disabled:opacity-50"
                          >
                            {savingId === chat.$id ? "Saving..." : "Save Chat"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          {hasLoaded ? (
            <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-base font-bold text-[#29496d]">
                  Page {pageNumber}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Showing up to {PAGE_SIZE} chats from {total} matching records.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={loading || pageNumber === 1}
                  onClick={goToPreviousPage}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-[#29496d] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ← Previous
                </button>

                <button
                  type="button"
                  disabled={loading || !nextCursor || chats.length < PAGE_SIZE}
                  onClick={goToNextPage}
                  className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </CmsAuthGuard>
  );
}
