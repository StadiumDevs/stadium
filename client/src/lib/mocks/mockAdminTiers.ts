/**
 * Mock-mode stores for the admin-tier pages and the program audit log (#303).
 *
 * Before these existed, the calls fell through to a real API in mock mode
 * (localhost:2000 under dev:harness; the production API on a preview without
 * VITE_API_BASE_URL). Rows persist in localStorage like the other mocks.
 *
 * The app-admin tier is seeded from VITE_ADMIN_ADDRESSES, so under
 * `npm run dev:harness` //Alice is an app admin. Mock mode can't tell who
 * signed the request (the session token is a fixed mock value), so the caller
 * is treated as an app admin whenever at least one app admin exists.
 */
import { ADMIN_ADDRESSES } from "@/lib/constants";
import type { ApiAdminTierEntry, ApiAuditLogEntry } from "@/lib/api";

const TIERS_KEY = "stadium_mock_admin_tiers_v1";
const AUDIT_KEY = "stadium_mock_audit_log_v1";

type Tier = "app" | "global";
type TierStore = Record<Tier, ApiAdminTierEntry[]>;

const SEED_TIME = "2026-01-01T00:00:00.000Z";

function seedTiers(): TierStore {
  return {
    app: ADMIN_ADDRESSES.map((a) => ({
      walletChain: a.chain,
      wallet: a.address,
      label: "Seeded from VITE_ADMIN_ADDRESSES",
      addedBy: null,
      createdAt: SEED_TIME,
    })),
    global: [],
  };
}

function readJson<T>(key: string, fallback: () => T, isValid: (v: unknown) => boolean = () => true): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isValid(parsed)) return parsed as T;
    }
  } catch {
    // corrupt or unavailable storage: fall back to the seed
  }
  return fallback();
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode): keep working in memory only
  }
}

const isTierStore = (v: unknown): boolean =>
  !!v && Array.isArray((v as TierStore).app) && Array.isArray((v as TierStore).global);

// Removing the last app admin locks you out of the mock tiers page; clear
// localStorage (or the key below) to re-seed.
const readTiers = (): TierStore => readJson(TIERS_KEY, seedTiers, isTierStore);

const sameWallet = (e: ApiAdminTierEntry, chain: string, wallet: string) =>
  e.walletChain === chain && e.wallet.toLowerCase() === wallet.toLowerCase();

export const mockAdminTiers = {
  isAppAdmin(): boolean {
    return readTiers().app.length > 0;
  },

  list(tier: Tier): ApiAdminTierEntry[] {
    return readTiers()[tier];
  },

  add(tier: Tier, entry: Pick<ApiAdminTierEntry, "walletChain" | "wallet" | "label">): ApiAdminTierEntry {
    const store = readTiers();
    const row: ApiAdminTierEntry = {
      walletChain: entry.walletChain,
      wallet: entry.wallet.trim(),
      label: entry.label?.trim() || null,
      addedBy: "mock",
      createdAt: new Date().toISOString(),
    };
    store[tier] = [...store[tier].filter((e) => !sameWallet(e, row.walletChain, row.wallet)), row];
    writeJson(TIERS_KEY, store);
    return row;
  },

  remove(tier: Tier, wallet: string, walletChain: string): void {
    const store = readTiers();
    store[tier] = store[tier].filter((e) => !sameWallet(e, walletChain, wallet));
    writeJson(TIERS_KEY, store);
  },
};

function seedAudit(slug: string): ApiAuditLogEntry[] {
  const alice = ADMIN_ADDRESSES[0]?.address ?? null;
  return [
    {
      id: `${slug}-audit-1`,
      programId: slug,
      actorChain: alice ? "substrate" : null,
      actorWallet: alice,
      action: "program.update",
      targetType: "program",
      targetId: slug,
      metadata: { fields: ["description"] },
      createdAt: "2026-01-02T10:00:00.000Z",
    },
    {
      id: `${slug}-audit-0`,
      programId: slug,
      actorChain: alice ? "substrate" : null,
      actorWallet: alice,
      action: "admin.add",
      targetType: "admin",
      targetId: alice ? `substrate:${alice}` : null,
      metadata: null,
      createdAt: "2026-01-01T09:00:00.000Z",
    },
  ];
}

export const mockAuditLog = {
  list(slug: string, limit?: number): ApiAuditLogEntry[] {
    const all = readJson<Record<string, ApiAuditLogEntry[]>>(
      AUDIT_KEY,
      () => ({}),
      (v) => !!v && typeof v === "object" && !Array.isArray(v),
    );
    const rows = all[slug] ?? seedAudit(slug);
    return typeof limit === "number" ? rows.slice(0, limit) : rows;
  },
};
