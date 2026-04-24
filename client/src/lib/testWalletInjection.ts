/**
 * Playwright harness: synthetic Polkadot-JS extension backed by a real
 * sr25519 keypair (//Alice dev account). Lets the stadium-tester Skill
 * exercise SIWS-gated flows in a headless browser without a wallet extension.
 *
 * Double-gated — activates only when BOTH hold:
 *   - import.meta.env.VITE_USE_TEST_WALLET === 'true'
 *   - import.meta.env.PROD !== true
 *
 * A production build ignores the flag. Never wire this wallet into prod
 * ADMIN_WALLETS / AUTHORIZED_SIGNERS on the server — the mnemonic is public.
 */
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import { u8aToHex, stringToU8a } from '@polkadot/util';

const ENABLED =
  import.meta.env.VITE_USE_TEST_WALLET === 'true' &&
  import.meta.env.PROD !== true;

const DEV_MNEMONIC =
  'bottom drive obey lake curtain smoke basket hold race lonely fit walk';

if (ENABLED && typeof window !== 'undefined') {
  const win = window as unknown as { injectedWeb3?: Record<string, unknown>; __TEST_WALLET_ENABLED__?: boolean };
  win.injectedWeb3 = {
    ...(win.injectedWeb3 ?? {}),
    'polkadot-js': {
      version: '0.0.0-test-wallet',
      enable: async () => {
        await cryptoWaitReady();
        const pair = new Keyring({ type: 'sr25519', ss58Format: 42 }).addFromUri(
          '//Alice',
        );
        const account = { address: pair.address, type: 'sr25519', name: 'Test Harness' };
        return {
          accounts: {
            get: async () => [account],
            subscribe: (cb: (accounts: typeof account[]) => void) => {
              cb([account]);
              return () => {};
            },
          },
          signer: {
            signRaw: async ({ data }: { address: string; data: string; type: string }) => ({
              id: Date.now(),
              signature: u8aToHex(pair.sign(stringToU8a(data))),
            }),
          },
          metadata: { get: async () => [], provide: async () => false },
          provider: { send: async () => ({}) },
        };
      },
    },
  };
  win.__TEST_WALLET_ENABLED__ = true;
}
