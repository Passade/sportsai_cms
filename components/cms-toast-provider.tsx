"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type CmsToastType = "success" | "error" | "info" | "warning";

type CmsToast = {
  id: string;
  type: CmsToastType;
  title: string;
  message?: string;
};

type CmsToastInput = {
  type?: CmsToastType;
  title: string;
  message?: string;
};

type CmsToastContextValue = {
  showToast: (toast: CmsToastInput) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  dismissToast: (id: string) => void;
};

const CmsToastContext = createContext<CmsToastContextValue | null>(null);

function getToastClasses(type: CmsToastType) {
  if (type === "success") {
    return "border-green-200 bg-green-50 text-green-800";
  }

  if (type === "error") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (type === "warning") {
    return "border-yellow-200 bg-yellow-50 text-yellow-800";
  }

  return "border-cyan-200 bg-cyan-50 text-cyan-800";
}

function getToastIcon(type: CmsToastType) {
  if (type === "success") return "✓";
  if (type === "error") return "!";
  if (type === "warning") return "!";
  return "i";
}

export function CmsToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<CmsToast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id)
    );
  }, []);

  const showToast = useCallback(
    (toast: CmsToastInput) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      const nextToast: CmsToast = {
        id,
        type: toast.type || "info",
        title: toast.title,
        message: toast.message,
      };

      setToasts((currentToasts) => [nextToast, ...currentToasts].slice(0, 5));

      window.setTimeout(() => {
        dismissToast(id);
      }, 5000);
    },
    [dismissToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      showSuccess: (title: string, message?: string) =>
        showToast({ type: "success", title, message }),
      showError: (title: string, message?: string) =>
        showToast({ type: "error", title, message }),
      showInfo: (title: string, message?: string) =>
        showToast({ type: "info", title, message }),
      showWarning: (title: string, message?: string) =>
        showToast({ type: "warning", title, message }),
      dismissToast,
    }),
    [dismissToast, showToast]
  );

  return (
    <CmsToastContext.Provider value={value}>
      {children}

      <div className="fixed right-5 top-5 z-[9999] flex w-[calc(100vw-40px)] max-w-md flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-2xl border p-4 shadow-lg backdrop-blur ${getToastClasses(
              toast.type
            )}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 text-sm font-black">
                {getToastIcon(toast.type)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-black">{toast.title}</p>

                {toast.message ? (
                  <p className="mt-1 break-words text-sm opacity-80">
                    {toast.message}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 rounded-full px-2 py-1 text-sm font-black opacity-60 transition hover:bg-white/70 hover:opacity-100"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </CmsToastContext.Provider>
  );
}

export function useCmsToast() {
  const context = useContext(CmsToastContext);

  if (!context) {
    throw new Error("useCmsToast must be used inside CmsToastProvider.");
  }

  return context;
}

export function getCmsErrorMessage(error: any) {
  return (
    error?.response?.message ||
    error?.message ||
    (typeof error === "string" ? error : "") ||
    "Something went wrong."
  );
}
