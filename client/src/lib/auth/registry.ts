/**
 * Wallet provider registry. The Solana provider is added in Phase C.
 */

import type { Chain, WalletProvider } from './types'
import { substrateProvider } from './substrateProvider'
import { ethereumProvider } from './ethereumProvider'

const providers: Partial<Record<Chain, WalletProvider>> = {
  substrate: substrateProvider,
  ethereum: ethereumProvider,
}

export function getProvider(chain: Chain): WalletProvider | undefined {
  return providers[chain]
}

/** Chains offered in the sign-in UI, in display order. */
export const ALL_CHAINS: Chain[] = ['substrate', 'ethereum']
