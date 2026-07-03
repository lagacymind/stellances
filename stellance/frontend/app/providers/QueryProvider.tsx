"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // One QueryClient per browser session; useState ensures it is not re-created
  // on every render while still being safe for concurrent React.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data stays fresh for 60 s before a background refetch is triggered
            staleTime: 60 * 1000,
            // Keep unused query data in cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Retry failed requests once before surfacing an error
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
