import type { backendInterface } from "@/backend";
import { remoteBackend } from "@/lib/remoteBackend";

// Drop-in replacement for Caffeine's `useActor(createActor)`. There is no
// async canister actor to initialize anymore — `remoteBackend` (Supabase
// Auth + profiles/workout_history) is a plain synchronous singleton, same
// shape as the `localBackend` it replaces — so this just hands it back
// immediately. Guest mode never calls into this (see useWorkoutStore's
// guestMode flag), so nothing here needs to branch on it.
export function useActor(): { actor: backendInterface; isFetching: boolean } {
  return { actor: remoteBackend, isFetching: false };
}
