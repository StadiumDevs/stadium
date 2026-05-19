/**
 * Wallet provider registry.
 */

import type { Chain, WalletProvider } from './types'
import { substrateProvider } from './substrateProvider'
import { ethereumProvider } from './ethereumProvider'
import { solanaProvider } from './solanaProvider'

const providers: Partial<Record<Chain, WalletProvider>> = {
  substrate: substrateProvider,
  ethereum: ethereumProvider,
  solana: solanaProvider,
}

export function getProvider(chain: Chain): WalletProvider | undefined {
  return providers[chain]
}

/** Chains offered in the sign-in UI, in display order. */
export const ALL_CHAINS: Chain[] = ['substrate', 'ethereum', 'solana']
