"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const response = await fetch("/api/cms-auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          router.replace("/");
          return;
        }

        setChecking(false);
      } catch {
        setChecking(false);
      }
    }

    checkExistingSession();
  }, [router]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      alert("Please enter your username and password.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/cms-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      if (!response.ok) {
        alert("Login failed. Check your username and password.");
        return;
      }

      router.replace("/");
    } catch (error) {
      console.error(error);
      alert("Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-8 text-[#29496d]">
        <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xl font-bold">Checking session...</p>
          <p className="mt-2 text-slate-500">Please wait.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-8 text-[#29496d]">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm"
      >
        <p className="text-sm font-bold uppercase tracking-[3px] text-cyan-600">
          SportsAI CMS
        </p>

        <h1 className="mt-3 text-4xl font-bold">Login</h1>

        <p className="mt-3 text-slate-500">
          Sign in with your CMS username and password.
        </p>

        <label className="mt-8 block">
          <span className="mb-2 block text-sm font-bold text-slate-500">
            Username
          </span>

          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin"
            autoComplete="username"
            className="h-14 w-full border border-slate-300 bg-white px-5 text-lg text-[#29496d] outline-none placeholder:text-slate-400 focus:border-cyan-500"
          />
        </label>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-bold text-slate-500">
            Password
          </span>

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your CMS password"
            autoComplete="current-password"
            className="h-14 w-full border border-slate-300 bg-white px-5 text-lg text-[#29496d] outline-none placeholder:text-slate-400 focus:border-cyan-500"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="mt-8 h-14 w-full bg-cyan-500 text-lg font-bold text-white transition hover:bg-cyan-600 disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Login"}
        </button>

        <p className="mt-5 text-center text-sm text-slate-400">
          Only approved SportsAI CMS users should sign in here.
        </p>
      </form>
    </main>
  );
}