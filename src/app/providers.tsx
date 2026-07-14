"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/lib/useAuth";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, refetchOnWindowFocus: true },
        },
      }),
  );

  // Telegram WebApp init: expand + apply theme
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor?.("#0a0b0f");
      tg.setBackgroundColor?.("#0a0b0f");
    }
  }, []);

  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
