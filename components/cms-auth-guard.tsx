"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CmsAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch("/api/cms-auth/me", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          router.replace("/login");
          return;
        }

        setChecking(false);
      } catch (error) {
        console.error(error);
        router.replace("/login");
      }
    }

    checkAuth();
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