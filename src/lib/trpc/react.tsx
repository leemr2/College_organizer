"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  loggerLink,
  unstable_httpBatchStreamLink,
  createWSClient,
  wsLink,
  splitLink,
} from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import SuperJSON from "superjson";

import { type AppRouter } from "@/lib/api/root";

const createQueryClient = () => new QueryClient();

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient());
};

export const api = createTRPCReact<AppRouter>();

// WebSocket client for subscriptions (disabled for Phase 1)
// To enable: set NEXT_PUBLIC_ENABLE_TRPC_WS=true in .env.local
// and ensure a WebSocket server is running on port 3001
const wsClient =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_ENABLE_TRPC_WS === "true"
    ? (() => {
        try {
          return createWSClient({
            url:
              process.env.NODE_ENV === "development"
                ? "ws://localhost:3001"
                : `wss://${window.location.host}`,
          });
        } catch (error) {
          console.warn("Failed to create WebSocket client:", error);
          return undefined;
        }
      })()
    : undefined;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        // Only use splitLink with WebSocket if wsClient is available
        // Otherwise, just use HTTP for all operations
        wsClient
          ? splitLink({
              condition: (op) => op.type === "subscription",
              true: wsLink({
                client: wsClient,
                transformer: SuperJSON,
              }),
              false: unstable_httpBatchStreamLink({
                transformer: SuperJSON,
                url: getBaseUrl() + "/api/trpc",
                headers: () => {
                  const headers = new Headers();
                  headers.set("x-trpc-source", "nextjs-react");
                  return headers;
                },
              }),
            })
          : unstable_httpBatchStreamLink({
              transformer: SuperJSON,
              url: getBaseUrl() + "/api/trpc",
              headers: () => {
                const headers = new Headers();
                headers.set("x-trpc-source", "nextjs-react");
                return headers;
              },
            }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
