/**
 * Mock fixture for `wallet_contacts`. Seeded for a couple of wallets so
 * NotificationsCard renders in preview mode.
 *
 * Phase 2 revamp, issue #71.
 */

export const mockWalletContacts: Record<string, { email: string | null; notificationsEnabled: boolean }> = {
  "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY": { email: "harness@example.com", notificationsEnabled: true },
  "5MockWalletAddressRedactedForPreviewPurposes00000": { email: null, notificationsEnabled: false },
};
