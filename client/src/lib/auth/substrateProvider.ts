/**
 * Substrate (SIWS — Sign-In With Substrate) wallet provider.
 *
 * Wraps the Polkadot-JS extension API. Heavy `@polkadot/*` modules are loaded
 * dynamically so they stay out of the initial bundle. The injector is
 * re-acquired on every `signIn` (it does not survive a page reload), so
 * `WalletAccount` only needs to carry the serializable extension `source` id.
 */

import type { WalletProvider, WalletAccount, SignParams } from './types'
import { encodeAuthPayload } from './types'

export const substrateProvider: WalletProvider = {
  chain: 'substrate',
  label: 'Polkadot',

  isAvailable() {
    return (
      typeof window !== 'undefined' &&
      !!window.injectedWeb3 &&
      Object.keys(window.injectedWeb3).length > 0
    )
  },

  async connect(): Promise<WalletAccount[]> {
    const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp')
    const extensions = await web3Enable('Stadium')
    if (!extensions.length) {
      throw new Error('No Polkadot extension authorization given.')
    }
    const accounts = await web3Accounts()
    if (!accounts.length) {
      throw new Error('No accounts found in the Polkadot extension.')
    }
    return accounts.map((account) => ({
      chain: 'substrate' as const,
      address: account.address,
      label: account.meta.name || undefined,
      source: account.meta.source,
    }))
  },

  async signIn({ account, statement }: SignParams): Promise<string> {
    const { SiwsMessage } = await import('@talismn/siws')
    const { web3Enable, web3FromSource } = await import('@polkadot/extension-dapp')

    await web3Enable('Stadium')
    const injector = await web3FromSource(account.source || 'polkadot-js')
    const signRaw = injector?.signer?.signRaw
    if (!signRaw) {
      throw new Error('Wallet does not support message signing')
    }

    const siws = new SiwsMessage({
      domain: window.location.hostname,
      uri: window.location.origin,
      address: account.address,
      nonce: Math.random().toString(36).slice(2),
      statement,
      // Short-lived — the server rejects expired / nonce-replayed messages.
      expirationTime: Date.now() + 10 * 60 * 1000,
    })
    const message = siws.prepareMessage()
    const { signature } = await signRaw({
      address: account.address,
      data: message,
      type: 'bytes',
    })

    return encodeAuthPayload({
      chain: 'substrate',
      message,
      signature,
      address: account.address,
    })
  },
}
