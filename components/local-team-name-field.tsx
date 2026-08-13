"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

let cachedTeamNames: string[] | null = null;
let teamNamesRequest: Promise<string[]> | null = null;

function normalizeTeamName(value?: string) {
  return String(value || "")
    .toLocaleLowerCase()
    .replace(/[’']/g, "")
    .replace(/\./g, "")
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadLocalTeamNames() {
  if (cachedTeamNames) {
    return cachedTeamNames;
  }

  if (teamNamesRequest) {
    return teamNamesRequest;
  }

  teamNamesRequest = fetch("/team-names.txt", {
    cache: "force-cache",
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Could not load local team names (${response.status}).`
        );
      }

      const text = await response.text();

      const names = Array.from(
        new Set(
          text
            .split(/\r?\n/)
            .map((name) => name.trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));

      cachedTeamNames = names;

      return names;
    })
    .finally(() => {
      teamNamesRequest = null;
    });

  return teamNamesRequest;
}

export function findCanonicalTeamName(
  value: string,
  teamNames: string[]
) {
  const normalizedValue = normalizeTeamName(value);

  if (!normalizedValue) {
    return "";
  }

  return (
    teamNames.find(
      (teamName) =>
        normalizeTeamName(teamName) === normalizedValue
    ) || ""
  );
}

type LocalTeamNameFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  datalistId: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
};

export default function LocalTeamNameField({
  label,
  value,
  onChange,
  datalistId,
  placeholder = "Start typing a team name...",
  required = false,
  className = "block",
  labelClassName =
    "mb-1 block text-xs font-bold text-[#8ba0b6]",
  inputClassName =
    "h-11 w-full border border-slate-300 bg-white px-4 text-sm font-semibold text-[#29496d] outline-none placeholder:text-[#9fb0c2] focus:border-cyan-500",
}: LocalTeamNameFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [teamNames, setTeamNames] = useState<string[]>(
    () => cachedTeamNames || []
  );

  const [loading, setLoading] = useState(!cachedTeamNames);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    loadLocalTeamNames()
      .then((names) => {
        if (!active) {
          return;
        }

        setTeamNames(names);
        setLoadError("");
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        console.error(
          "Local team names load error:",
          error
        );

        setLoadError(
          "Could not load the local team list."
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  /*
   * Check whether the current value matches one of
   * the names in team-names.txt.
   *
   * Example:
   *
   * "heritage-school"
   * "Heritage School"
   *
   * can resolve to the canonical team name.
   *
   * But a completely custom team name is ALSO valid.
   */
  const canonicalName = useMemo(
    () => findCanonicalTeamName(value, teamNames),
    [teamNames, value]
  );

  /*
   * If an imported/FMS team name matches a local team
   * after normalization, replace it with the canonical
   * spelling from team-names.txt.
   *
   * If it does NOT match, leave the user's text alone.
   */
  useEffect(() => {
    if (
      canonicalName &&
      canonicalName !== value
    ) {
      onChange(canonicalName);
    }
  }, [
    canonicalName,
    onChange,
    value,
  ]);

  /*
   * When leaving the field:
   *
   * 1. If the entered name matches a local team,
   *    use its canonical spelling.
   *
   * 2. If it does not match a local team,
   *    KEEP THE FREE-TEXT VALUE.
   *
   * No exact-match validation is performed.
   */
  function canonicalizeIfKnown() {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    /*
     * Always clear any previous custom validation
     * messages from older component behaviour.
     */
    input.setCustomValidity("");

    const trimmedValue = value.trim();

    /*
     * Do nothing if empty.
     *
     * If required=true, the browser's normal
     * required validation will handle it.
     */
    if (!trimmedValue) {
      return;
    }

    const exactName =
      findCanonicalTeamName(
        trimmedValue,
        teamNames
      );

    /*
     * Known team:
     * use canonical name from team-names.txt.
     */
    if (
      exactName &&
      exactName !== value
    ) {
      onChange(exactName);
      return;
    }

    /*
     * Unknown/custom team:
     * keep exactly what the user typed,
     * except remove accidental outside whitespace.
     */
    if (trimmedValue !== value) {
      onChange(trimmedValue);
    }
  }

  return (
    <label className={className}>
      <span className={labelClassName}>
        {label}
      </span>

      <input
        ref={inputRef}
        type="text"
        list={datalistId}
        required={required}
        value={value}
        onChange={(event) => {
          /*
           * Clear any old validation error.
           *
           * Every typed value is allowed.
           */
          event.currentTarget.setCustomValidity("");

          /*
           * Store exactly what the user types.
           */
          onChange(
            event.currentTarget.value
          );
        }}
        onInput={(event) => {
          /*
           * Extra protection against a stale
           * "select an exact team" validation
           * message remaining on the input.
           */
          event.currentTarget.setCustomValidity("");
        }}
        onBlur={canonicalizeIfKnown}
        placeholder={
          loading
            ? "Loading local team names..."
            : placeholder
        }
        autoComplete="off"
        className={inputClassName}
      />

      <datalist id={datalistId}>
        {teamNames.map((teamName) => (
          <option
            key={teamName}
            value={teamName}
          />
        ))}
      </datalist>

      {loadError ? (
        <span className="mt-1 block text-xs font-semibold text-red-500">
          {loadError}
        </span>
      ) : null}
    </label>
  );
}