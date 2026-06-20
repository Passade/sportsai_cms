"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CmsLogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await fetch("/api/cms-auth/logout", {
        method: "POST",
        credentials: "include",
      });

      router.replace("/login");
    } catch (error) {
      console.error(error);
      alert("Could not log out.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="rounded border border-slate-300 bg-white px-5 py-3 font-bold text-[#29496d] transition hover:border-red-300 hover:text-red-600 disabled:opacity-50"
    >
      {loggingOut ? "Logging out..." : "Logout"}
    </button>
  );
}