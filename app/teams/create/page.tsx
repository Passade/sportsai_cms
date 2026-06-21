"use client";

import CmsAuthGuard from "@/components/cms-auth-guard";
import { createCmsTeam } from "@/lib/cms";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-[#8ba0b6]">
        {label}
      </span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-14 w-full border border-slate-300 bg-white px-5 text-lg text-[#29496d] outline-none placeholder:text-[#9fb0c2] focus:border-cyan-500"
      />
    </label>
  );
}

export default function CreateTeamPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      alert("Please add a team name.");
      return;
    }

    try {
      setSubmitting(true);

      await createCmsTeam({
        name,
        shortName,
        logoUrl,
      });

      router.push("/teams");
    } catch (error) {
      console.error(error);
      alert("Could not create team. Check your Appwrite fields and permissions.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CmsAuthGuard>
      <main className="min-h-screen bg-[#f8fafc] px-8 py-8 text-[#29496d]">
        <Link href="/teams" className="text-2xl font-medium text-cyan-600">
          Back to teams list
        </Link>

        <h1 className="mt-4 text-center text-5xl font-bold">Create Team</h1>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-20 max-w-3xl space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
        >
          <TextField
            label="Team Name"
            value={name}
            onChange={setName}
            placeholder="Prince Edward"
          />

          <TextField
            label="Short Name"
            value={shortName}
            onChange={setShortName}
            placeholder="PE"
          />

          <TextField
            label="Logo URL"
            value={logoUrl}
            onChange={setLogoUrl}
            placeholder="https://example.com/logo.png"
          />

          {logoUrl ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
                Logo Preview
              </p>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt=""
                className="h-24 w-24 rounded-full border border-slate-200 object-cover"
              />
            </div>
          ) : null}

          <div className="flex justify-end gap-4 pt-6">
            <button
              type="button"
              onClick={() => router.back()}
              className="border border-slate-300 bg-white px-10 py-4 text-lg font-bold text-[#29496d]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="bg-cyan-500 px-10 py-4 text-lg font-bold text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Team"}
            </button>
          </div>
        </form>
      </main>
    </CmsAuthGuard>
  );
}
