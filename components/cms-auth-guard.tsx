"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const CMS_AUTH_CACHE_KEY = "sportsai_cms_auth_checked_at";
const CMS_AUTH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedAuthValid() {
  if (typeof window === "undefined") return false;

  const checkedAt = Number(
    window.sessionStorage.getItem(CMS_AUTH_CACHE_KEY) || "0"
  );

  if (!checkedAt) return false;

  return Date.now() - checkedAt < CMS_AUTH_CACHE_TTL_MS;
}

function setCachedAuthValid() {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(CMS_AUTH_CACHE_KEY, String(Date.now()));
}

function clearCachedAuthValid() {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(CMS_AUTH_CACHE_KEY);
}

export default function CmsAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      if (getCachedAuthValid()) {
        if (mounted) {
          setChecking(false);
        }

        return;
      }

      try {
        const response = await fetch("/api/cms-auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          clearCachedAuthValid();
          router.replace("/login");
          return;
        }

        setCachedAuthValid();

        if (mounted) {
          setChecking(false);
        }
      } catch (error) {
        console.error(error);
        clearCachedAuthValid();
        router.replace("/login");
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-8 text-[#29496d]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xl font-bold">Checking CMS access...</p>
          <p className="mt-2 text-slate-500">Please wait.</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}