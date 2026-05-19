/**
 * Multi-chain sign-in types.
 *
 * A `WalletProvider` wraps one wallet ecosystem (Substrate, Ethereum, Solana)
 * behind a uniform interface. The signed result is the base64 `x-siws-auth`
 * payload — `base64(JSON.stringify({ chain, message, signature, address }))` —
 * which the server's per-chain verifier validates.
 */

export type Chain = 'substrate' | 'ethereum' | 'solana';

export interface WalletAccount {
  chain: Chain;
  address: string;
  /** Human-readable label (extension account name, or a truncated address). */
  label?: string;
  /**
   * Substrate only: the injected extension source id (e.g. "polkadot-js").
   * Kept so the injector can be re-acquired after a page reload. Serializable
   * — `WalletAccount` is persisted to sessionStorage.
   */
  source?: string;
}

export interface SignParams {
  account: WalletAccount;
  /** The human-readable statement the wallet shows the user (see siwsUtils). */
  statement: string;
}

export interface AuthPayload {
  chain: Chain;
  message: string;
  signature: string;
  address: string;
}

export interface WalletProvider {
  chain: Chain;
  /** Display name for the chain in the picker UI. */
  label: string;
  /** Best-effort sync check that the wallet extension is present. */
  isAvailable(): boolean;
  /** Trigger the extension authorization prompt; resolve with its accounts. */
  connect(): Promise<WalletAccount[]>;
  /** Build the chain's sign-in message, request a signature, return the header. */
  signIn(params: SignParams): Promise<string>;
}

/** Encode a signed payload into the base64 `x-siws-auth` header value. */
export function encodeAuthPayload(payload: AuthPayload): string {
  return btoa(JSON.stringify(payload));
}
