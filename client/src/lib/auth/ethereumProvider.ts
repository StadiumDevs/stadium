/**
 * Ethereum (SIWE — Sign-In With Ethereum, EIP-4361) wallet provider.
 *
 * Discovers wallets via EIP-6963 (multi-wallet announcement) and falls back to
 * the legacy `window.ethereum` injection. The SIWE message is built with viem
 * and signed with `personal_sign` (EIP-191).
 */

import { getAddress } from 'viem'
import { createSiweMessage, generateSiweNonce } from 'viem/siwe'
import type { WalletProvider, WalletAccount, SignParams } from './types'
import { encodeAuthPayload } from './types'

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
}

interface Eip6963ProviderDetail {
  info: { uuid: string; name: string; icon: string; rdns: string }
  provider: Eip1193Provider
}

// EIP-6963 announced wallets, collected as they arrive.
const discovered: Eip6963ProviderDetail[] = []
// The provider the user actually connected through (preferred for signing).
let selectedProvider: Eip1193Provider | null = null

function requestAnnouncements(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('eip6963:requestProvider'))
}

if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (event: Event) => {
    const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail
    if (detail?.info?.uuid && !discovered.some((d) => d.info.uuid === detail.info.uuid)) {
      discovered.push(detail)
    }
  })
  requestAnnouncements()
}

function legacyProvider(): Eip1193Provider | null {
  const injected = (window as unknown as { ethereum?: Eip1193Provider }).ethereum
  return injected || null
}

function resolveProvider(): Eip1193Provider | null {
  if (selectedProvider) return selectedProvider
  if (discovered.length > 0) return discovered[0].provider
  return legacyProvider()
}

export const ethereumProvider: WalletProvider = {
  chain: 'ethereum',
  label: 'Ethereum',

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false
    return discovered.length > 0 || !!legacyProvider()
  },

  async connect(): Promise<WalletAccount[]> {
    // Re-poll in case a wallet extension injected after initial load.
    requestAnnouncements()
    const provider = resolveProvider()
    if (!provider) {
      throw new Error('No Ethereum wallet found. Please install MetaMask or another EIP-6963 wallet.')
    }

    const addresses = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
    if (!addresses?.length) {
      throw new Error('No accounts returned by the Ethereum wallet.')
    }
    selectedProvider = provider

    return addresses.map((address) => ({
      chain: 'ethereum' as const,
      address,
      label: `${address.slice(0, 6)}…${address.slice(-4)}`,
    }))
  },

  async signIn({ account, statement }: SignParams): Promise<string> {
    const provider = resolveProvider()
    if (!provider) {
      throw new Error('No Ethereum wallet found.')
    }

    // chainId is informational — the server verifies signature, statement and
    // domain, not the chain id — so a lookup failure falls back to mainnet.
    let chainId = 1
    try {
      const raw = await provider.request({ method: 'eth_chainId' })
      const parsed = typeof raw === 'string' ? parseInt(raw, 16) : Number(raw)
      if (Number.isFinite(parsed) && parsed > 0) chainId = parsed
    } catch {
      /* keep default */
    }

    const message = createSiweMessage({
      address: getAddress(account.address),
      chainId,
      domain: window.location.hostname,
      nonce: generateSiweNonce(),
      uri: window.location.origin,
      version: '1',
      statement,
      // Short-lived message — the server rejects expired SIWE messages.
      expirationTime: new Date(Date.now() + 10 * 60 * 1000),
    })

    const signature = (await provider.request({
      method: 'personal_sign',
      params: [message, account.address],
    })) as string

    return encodeAuthPayload({
      chain: 'ethereum',
      message,
      signature,
      address: account.address,
    })
  },
}
