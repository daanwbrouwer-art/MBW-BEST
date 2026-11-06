import { QueryClient } from "@tanstack/react-query";

/**
 * The app's react-query cache. Shared as a module so signing out or switching
 * accounts can clear it (lib/accountSession.ts) and the next account never
 * sees the previous one's cached profile, friends or history.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});
