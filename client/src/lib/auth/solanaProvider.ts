/**
 * Solana (Sign-In With Solana) wallet provider.
 *
 * Uses the injected `window.solana` wallet (Phantom and compatible wallets).
 * The sign-in message is a fixed SIWE-style plaintext signed via `signMessage`
 * (ed25519); the server's solana verifier parses the same format.
 */

import bs58 from 'bs58'
import type { WalletProvider, WalletAccount, SignParams } from './types'
import { encodeAuthPayload } from './types'

interface SolanaWallet {
  isPhantom?: boolean
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>
  signMessage(message: Uint8Array, encoding?: string): Promise<{ signature: Uint8Array }>
}

function getWallet(): SolanaWallet | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { solana?: SolanaWallet }).solana || null
}

/**
 * Build the fixed Solana sign-in message. Must stay byte-for-byte in sync with
 * `parseSolanaMessage` in server/api/auth/verifiers/solana.verifier.js.
 */
function buildSignInMessage(params: {
  domain: string
  address: string
  statement: string
  uri: string
  nonce: string
  issuedAt: string
  expirationTime: string
}): string {
  return [
    `${params.domain} wants you to sign in with your Solana account:`,
    params.address,
    '',
    params.statement,
    '',
    `URI: ${params.uri}`,
    'Version: 1',
    `Nonce: ${params.nonce}`,
    `Issued At: ${params.issuedAt}`,
    `Expiration Time: ${params.expirationTime}`,
  ].join('\n')
}

export const solanaProvider: WalletProvider = {
  chain: 'solana',
  label: 'Solana',

  isAvailable(): boolean {
    return !!getWallet()
  },

  async connect(): Promise<WalletAccount[]> {
    const wallet = getWallet()
    if (!wallet) {
      throw new Error('No Solana wallet found. Please install Phantom.')
    }
    const { publicKey } = await wallet.connect()
    const address = publicKey.toString()
    return [
      {
        chain: 'solana' as const,
        address,
        label: `${address.slice(0, 4)}…${address.slice(-4)}`,
      },
    ]
  },

  async signIn({ account, statement }: SignParams): Promise<string> {
    const wallet = getWallet()
    if (!wallet) {
      throw new Error('No Solana wallet found.')
    }

    const now = new Date()
    const message = buildSignInMessage({
      domain: window.location.hostname,
      address: account.address,
      statement,
      uri: window.location.origin,
      nonce: Math.random().toString(36).slice(2),
      issuedAt: now.toISOString(),
      // Short-lived — the server rejects expired sign-in messages.
      expirationTime: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    })

    const { signature } = await wallet.signMessage(new TextEncoder().encode(message), 'utf8')

    return encodeAuthPayload({
      chain: 'solana',
      message,
      signature: bs58.encode(signature),
      address: account.address,
    })
  },
}
