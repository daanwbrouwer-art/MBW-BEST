// Referral codes/discounts, layered onto the account records `localBackend.ts`
// already keeps in `mbw_accounts_db` (one JSON blob keyed by email). Read
// and write only ever touch the new `account.referral` sub-field — every
// other field (including the profile's bigint counters, stored as decimal
// strings via the app's `BigInt.prototype.toJSON` patch) passes through
// untouched on each read-modify-write.

const ACCOUNTS_KEY = "mbw_accounts_db";

export interface ReferralRecord {
  code: string;
  /** How many people successfully signed up using this account's code. */
  successfulReferrals: number;
  /** True if this account itself signed up using someone else's code. */
  wasReferred: boolean;
  /** The invited-friend 10%-off-first-payment bonus is one-time only. */
  firstPaymentDiscountUsed: boolean;
  /** Emails of accounts that signed up with this account's code — lets the
   * "Team Captain" achievement check how many actually completed a workout,
   * not just how many registered. */
  referredEmails?: string[];
}

interface RawAccounts {
  [email: string]: {
    account: { username?: string; referral?: ReferralRecord; [k: string]: unknown };
    [k: string]: unknown;
  };
}

function readRaw(): RawAccounts {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as RawAccounts) : {};
  } catch {
    return {};
  }
}

function writeRaw(data: RawAccounts): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(data));
}

export function getCurrentEmail(): string | null {
  try {
    const raw = localStorage.getItem("mbw_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string };
    return parsed.email ?? null;
  } catch {
    return null;
  }
}

function generateCode(username: string): string {
  const base = (username || "MBW").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MBW-${base || "USER"}${suffix}`;
}

/** Creates this account's referral code the first time it's needed (idempotent). */
export function ensureReferralCode(email: string): string {
  const accounts = readRaw();
  const record = accounts[email];
  if (!record) return "";
  if (record.account.referral?.code) return record.account.referral.code;

  const code = generateCode((record.account.username as string) ?? "");
  record.account.referral = {
    code,
    successfulReferrals: record.account.referral?.successfulReferrals ?? 0,
    wasReferred: record.account.referral?.wasReferred ?? false,
    firstPaymentDiscountUsed: record.account.referral?.firstPaymentDiscountUsed ?? false,
  };
  writeRaw(accounts);
  return code;
}

export function getReferralRecord(email: string): ReferralRecord | null {
  const accounts = readRaw();
  const record = accounts[email];
  if (!record) return null;
  return record.account.referral ?? null;
}

/**
 * Called right after a new account registers, if they entered a friend's
 * code. No-op (not an error) for an unknown/self-referral code — a typo'd
 * code shouldn't block registration.
 */
export function redeemReferralCode(
  newUserEmail: string,
  code: string,
): { ok: boolean; error?: string } {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { ok: true };

  const accounts = readRaw();
  const ownerEmail = Object.keys(accounts).find(
    (email) => accounts[email].account.referral?.code === trimmed,
  );
  if (!ownerEmail) return { ok: false, error: "Referral code not found" };
  if (ownerEmail === newUserEmail) {
    return { ok: false, error: "You can't refer yourself" };
  }

  const newUser = accounts[newUserEmail];
  if (!newUser) return { ok: false, error: "Account not found" };

  newUser.account.referral = {
    code: ensureReferralCode(newUserEmail),
    successfulReferrals: newUser.account.referral?.successfulReferrals ?? 0,
    wasReferred: true,
    firstPaymentDiscountUsed: false,
  };

  const owner = accounts[ownerEmail];
  const ownerReferral = owner.account.referral ?? {
    code: trimmed,
    successfulReferrals: 0,
    wasReferred: false,
    firstPaymentDiscountUsed: false,
    referredEmails: [],
  };
  owner.account.referral = {
    ...ownerReferral,
    successfulReferrals: ownerReferral.successfulReferrals + 1,
    referredEmails: [...(ownerReferral.referredEmails ?? []), newUserEmail],
  };

  writeRaw(accounts);
  return { ok: true };
}

export function markFirstPaymentDiscountUsed(email: string): void {
  const accounts = readRaw();
  const record = accounts[email];
  if (!record?.account.referral) return;
  record.account.referral.firstPaymentDiscountUsed = true;
  writeRaw(accounts);
}

const REFERRER_BONUS_CAP = 50;
const REFERRER_BONUS_PER_REFERRAL = 10;
const INVITEE_FIRST_PAYMENT_BONUS = 10;

/** How many of this account's referred friends have completed at least one workout (`history.length > 0`) — used by the "Team Captain" achievement, which requires more than just a signup. */
export function countReferredUsersWithSessions(email: string): number {
  const accounts = readRaw();
  const referral = accounts[email]?.account.referral;
  const referredEmails = referral?.referredEmails ?? [];
  return referredEmails.filter((refEmail) => {
    const record = accounts[refEmail] as { history?: unknown[] } | undefined;
    return Array.isArray(record?.history) && record.history.length > 0;
  }).length;
}

/** Referrer's per-referral bonus (10% each, capped 50%) plus the invited-friend's one-time first-payment 10% — combined total also capped at 50%. */
export function computeDiscountPct(referral: ReferralRecord | null): number {
  if (!referral) return 0;
  const referrerBonus = Math.min(
    REFERRER_BONUS_CAP,
    referral.successfulReferrals * REFERRER_BONUS_PER_REFERRAL,
  );
  const inviteeBonus =
    referral.wasReferred && !referral.firstPaymentDiscountUsed
      ? INVITEE_FIRST_PAYMENT_BONUS
      : 0;
  return Math.min(REFERRER_BONUS_CAP, referrerBonus + inviteeBonus);
}
