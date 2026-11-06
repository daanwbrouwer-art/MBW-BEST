// Which account the data on this device belongs to, and a guard for
// background syncs.
//
// A sync started for account A can finish after A signed out (or after B
// signed in). Every sync captures a scope when it starts and checks it is
// still current before writing anything to the device, so a late result
// never lands in another account's data.

/** localStorage key: the account id the local data belongs to. */
export const OWNER_KEY = "mbw_owner";

let generation = 0;

export interface AccountScope {
  userId: string;
  generation: number;
}

/** Invalidates every sync in flight. Call on sign-in and sign-out. */
export function bumpGeneration(): void {
  generation += 1;
}

export function captureScope(userId: string): AccountScope {
  return { userId, generation };
}

/** True while the device still belongs to the account the sync started for. */
export function isScopeCurrent(scope: AccountScope): boolean {
  return (
    scope.generation === generation &&
    localStorage.getItem(OWNER_KEY) === scope.userId
  );
}
