"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import CmsImageUpload from "@/components/cms-image-upload";
import {
  CmsTeam,
  deleteCmsPlayer,
  getCmsPlayerById,
  getCmsTeams,
  normalizeDateForInput,
  updateCmsPlayer,
} from "@/lib/cms";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const initialForm = {
  name: "",
  school: "",
  teamName: "",
  sport: "",
  position: "",
  number: "0",
  dateOfBirth: "",
  age: "0",
  country: "",
  imageUrl: "",
  active: true,
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        required={required}
        className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
      />
    </label>
  );
}

function TeamNameField({
  value,
  onChange,
  teams,
}: {
  value: string;
  onChange: (value: string) => void;
  teams: CmsTeam[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
        Team Name
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        list="player-edit-team-options"
        placeholder="Start typing a team name..."
        className="mt-2 w-full rounded border border-slate-200 px-4 py-3 text-[#29496d] outline-none focus:border-cyan-400"
      />

      <datalist id="player-edit-team-options">
        {teams.map((team) => (
          <option key={team.$id} value={team.name || ""} />
        ))}
      </datalist>
    </label>
  );
}

export default function EditPlayerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [teams, setTeams] = useState<CmsTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setTeamsLoading(true);

        const [player, teamList] = await Promise.all([
          getCmsPlayerById(params.id),
          getCmsTeams(),
        ]);

        setTeams(teamList);

        setForm({
          name: String(player.name || ""),
          school: String(player.school || ""),
          teamName: String(player.teamName || ""),
          sport: String(player.sport || ""),
          position: String(player.position || ""),
          number: String(player.number ?? 0),
          dateOfBirth: normalizeDateForInput(String(player.dateOfBirth || "")),
          age: String(player.age ?? 0),
          country: String(player.country || ""),
          imageUrl: String(player.imageUrl || ""),
          active: Boolean(player.active),
        });
      } catch (error: any) {
        console.error("Load player error:", error);

        alert(
          error?.message ||
            error?.response?.message ||
            JSON.stringify(error) ||
            "Could not load player."
        );
      } finally {
        setLoading(false);
        setTeamsLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  function updateField(key: keyof typeof initialForm, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Player name is required.");
      return;
    }

    try {
      setSaving(true);
      await updateCmsPlayer(params.id, form);
      router.push("/players");
    } catch (error: any) {
      console.error("Update player error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not update player."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete this player? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      await deleteCmsPlayer(params.id);
      router.push("/players");
    } catch (error: any) {
      console.error("Delete player error:", error);

      alert(
        error?.message ||
          error?.response?.message ||
          JSON.stringify(error) ||
          "Could not delete player."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <CmsAuthGuard>
        <main className="min-h-screen bg-[#f8fafc] px-8 py-10 text-[#29496d]">
          Loading player...
        </main>
      </CmsAuthGuard>
    );
  }

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] text-[#29496d]">
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-5 px-8 py-6">
            <div>
              <Link
                href="/players"
                className="text-sm font-bold uppercase tracking-[3px] text-cyan-600"
              >
                ← Players
              </Link>

              <h1 className="mt-2 text-4xl font-bold">Edit Player</h1>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded border border-red-200 bg-white px-5 py-3 font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete Player"}
            </button>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mx-auto grid max-w-5xl gap-6 px-8 py-10"
        >
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-[#29496d]">Player Details</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field
                label="Name"
                value={form.name}
                onChange={(value) => updateField("name", value)}
                placeholder="Player name"
                required
              />

              <Field
                label="School"
                value={form.school}
                onChange={(value) => updateField("school", value)}
                placeholder="School"
              />

              <TeamNameField
                value={form.teamName}
                onChange={(value) => updateField("teamName", value)}
                teams={teams}
              />

              <Field
                label={teamsLoading ? "Sport - loading teams..." : "Sport"}
                value={form.sport}
                onChange={(value) => updateField("sport", value)}
                placeholder="Football, Basketball, Soccer..."
              />

              <Field
                label="Position"
                value={form.position}
                onChange={(value) => updateField("position", value)}
                placeholder="Position"
              />

              <Field
                label="Jersey Number"
                value={form.number}
                onChange={(value) => updateField("number", value)}
                type="number"
                placeholder="0"
              />

              <Field
                label="Date of Birth"
                value={form.dateOfBirth}
                onChange={(value) => updateField("dateOfBirth", value)}
                type="date"
              />

              <Field
                label="Age"
                value={form.age}
                onChange={(value) => updateField("age", value)}
                type="number"
                placeholder="0"
              />

              <Field
                label="Country"
                value={form.country}
                onChange={(value) => updateField("country", value)}
                placeholder="Country"
              />

              <Field
                label="Image URL"
                value={form.imageUrl}
                onChange={(value) => updateField("imageUrl", value)}
                placeholder="https://..."
              />

              <div className="md:col-span-2">
                <CmsImageUpload
                  label="Upload Player Photo"
                  value={form.imageUrl}
                  onUploaded={(url) => updateField("imageUrl", url)}
                />
              </div>
            </div>

            <label className="mt-6 flex items-center gap-3">
              <input
                checked={form.active}
                onChange={(event) => updateField("active", event.target.checked)}
                type="checkbox"
                className="h-5 w-5"
              />

              <span className="font-bold text-[#29496d]">Active player</span>
            </label>

            {form.imageUrl ? (
              <div className="mt-6">
                <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
                  Image Preview
                </p>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.imageUrl}
                  alt="Player preview"
                  className="h-32 w-32 rounded-3xl object-cover"
                />
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/players"
              className="rounded border border-slate-200 bg-white px-7 py-4 text-lg font-bold text-[#29496d] transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="rounded bg-cyan-500 px-7 py-4 text-lg font-bold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Player"}
            </button>
          </div>
        </form>
      </main>
    </CmsAuthGuard>
  );
}
