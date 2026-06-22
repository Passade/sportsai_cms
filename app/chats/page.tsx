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
  getCmsFixtureChats,
  getCmsFixtureChatsByFixtureId,
  updateCmsFixtureChat,
} from "@/lib/cms";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ChatDraft = {
  userName: string;
  message: string;
  replyToUserName: string;
  replyToMessage: string;
  reactions: string;
};

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

export default function ChatsAdminPage() {
  const { showSuccess, showError, showWarning } = useCmsToast();

  const [chats, setChats] = useState<CmsFixtureChat[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ChatDraft>>({});
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [fixtureFilter, setFixtureFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  async function loadChats() {
    try {
      setLoading(true);

      const fixtureId = fixtureFilter.trim();
      const result = fixtureId
        ? await getCmsFixtureChatsByFixtureId(fixtureId)
        : await getCmsFixtureChats();

      setChats(result);

      const nextDrafts: Record<string, ChatDraft> = {};
      result.forEach((chat) => {
        nextDrafts[chat.$id] = buildDraft(chat);
      });
      setDrafts(nextDrafts);
    } catch (error) {
      console.error("Load fixture chats error:", error);
      showError("Could not load chats", getCmsErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return chats;

    return chats.filter((chat) =>
      [
        chat.fixtureId,
        chat.userId,
        chat.userName,
        chat.message,
        chat.replyToMessageId,
        chat.replyToUserName,
        chat.replyToMessage,
        chat.reactions,
        chat.$id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [chats, search]);

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
                className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
              >
                ← Dashboard
              </Link>

              <h1 className="mt-2 text-4xl font-bold">Fixture Chats</h1>

              <p className="mt-2 text-slate-500">
                Administer chat messages, replies and reactions for fixtures.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadChats}
                className="rounded border border-slate-200 bg-white px-5 py-4 font-bold text-[#29496d] transition hover:bg-slate-50"
              >
                Refresh
              </button>

              <CmsLogoutButton />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-8 py-10">
          <div className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm xl:grid-cols-2">
            <label>
              <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                Search chats
              </span>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search message, user, fixture ID, reactions..."
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
                  onChange={(event) => setFixtureFilter(event.target.value)}
                  placeholder="Paste fixtureId to load one fixture chat"
                  className="w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
                />

                <button
                  type="button"
                  onClick={loadChats}
                  className="rounded bg-cyan-500 px-5 py-3 font-bold text-white hover:bg-cyan-600"
                >
                  Apply
                </button>
              </div>
            </label>
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="font-bold">
              Showing {filteredChats.length} of {chats.length} loaded chat
              messages
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Without a fixture filter, this page loads the latest 500 chat
              messages.
            </p>
          </div>

          {loading ? (
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
                    className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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
                          onClick={() => handleClearReactions(chat)}
                          disabled={savingId === chat.$id}
                          className="rounded border border-yellow-200 bg-white px-4 py-3 font-bold text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
                        >
                          Clear Reactions
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(chat)}
                          disabled={savingId === chat.$id}
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
                              updateDraft(
                                chat.$id,
                                "userName",
                                event.target.value
                              )
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
                              updateDraft(
                                chat.$id,
                                "message",
                                event.target.value
                              )
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
                                updateDraft(
                                  chat.$id,
                                  "reactions",
                                  event.target.value
                                )
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
                            disabled={savingId === chat.$id}
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
        </section>
      </main>
    </CmsAuthGuard>
  );
}
