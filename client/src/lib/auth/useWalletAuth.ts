/**
 * useWalletAuth — multi-chain wallet connection + signing for Stadium.
 *
 * Owns the selected chain, the connected account, and session restore. The
 * connecting page decides what the account is allowed to do (e.g. admin
 * gating) — this hook is identity-agnostic.
 */

import { useCallback, useEffect, useState } from 'react'
import type { Chain, WalletAccount } from './types'
import { getProvider } from './registry'
import { generateSiwsStatement, type SiwsContext } from '@/lib/siwsUtils'
import { readAdminToken, writeAdminToken, clearAdminToken } from './adminSession'
import { API_BASE_URL } from '@/lib/api'

const SESSION_KEY = 'stadium_wallet_session_v2'

/** Headers an admin caller can attach. Exactly one of these is populated. */
export type AdminAuthHeaders =
  | { Authorization: string; 'x-siws-auth'?: never }
  | { 'x-siws-auth': string; Authorization?: never }

export interface WalletAuth {
  chain: Chain
  setChain: (chain: Chain) => void
  account: WalletAccount | null
  accounts: WalletAccount[]
  isConnecting: boolean
  error: string
  /** Whether the wallet extension for the selected chain is detected. */
  isAvailable: boolean
  /** Trigger the extension prompt; resolves with the wallet's accounts. */
  connect: () => Promise<WalletAccount[]>
  /** Mark an account as the active session (persists to sessionStorage). */
  selectAccount: (account: WalletAccount) => void
  /** Sign an action; resolves with the base64 `x-siws-auth` header value. */
  signAction: (action: SiwsContext['action'], context?: Partial<SiwsContext>) => Promise<string>
  /**
   * Get an admin auth bearer token, signing once + exchanging if the cache
   * is empty or expired. Resolves with `Authorization: Bearer …` headers so
   * the caller can spread them straight into a fetch.
   */
  getAdminBearerHeaders: () => Promise<AdminAuthHeaders>
  disconnect: () => void
}

export function useWalletAuth(): WalletAuth {
  const [chain, setChain] = useState<Chain>('substrate')
  const [account, setAccount] = useState<WalletAccount | null>(null)
  const [accounts, setAccounts] = useState<WalletAccount[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState('')
  const [isAvailable, setIsAvailable] = useState(false)

  // Restore a previous session (survives page reloads within the tab).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as WalletAccount
        if (parsed?.chain && parsed?.address) {
          setAccount(parsed)
          setChain(parsed.chain)
        } else {
          sessionStorage.removeItem(SESSION_KEY)
        }
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY)
    }
  }, [])

  // Poll for the selected chain's wallet — extensions inject asynchronously.
  useEffect(() => {
    let cancelled = false
    let attempts = 0
    const provider = getProvider(chain)

    const check = () => {
      if (cancelled) return
      if (provider?.isAvailable()) {
        setIsAvailable(true)
        return
      }
      if (++attempts >= 10) {
        setIsAvailable(false)
        return
      }
      setTimeout(check, 500)
    }

    setIsAvailable(provider?.isAvailable() ?? false)
    if (!provider?.isAvailable()) check()
    return () => {
      cancelled = true
    }
  }, [chain])

  const connect = useCallback(async (): Promise<WalletAccount[]> => {
    setIsConnecting(true)
    setError('')
    try {
      const provider = getProvider(chain)
      if (!provider) throw new Error(`Unsupported sign-in chain: ${chain}`)
      const found = await provider.connect()
      setAccounts(found)
      return found
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wallet connection failed')
      throw e
    } finally {
      setIsConnecting(false)
    }
  }, [chain])

  const selectAccount = useCallback((selected: WalletAccount) => {
    setAccount(selected)
    setChain(selected.chain)
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(selected))
    } catch {
      /* sessionStorage unavailable — session simply won't persist */
    }
  }, [])

  const signAction = useCallback(
    async (action: SiwsContext['action'], context?: Partial<SiwsContext>): Promise<string> => {
      if (!account) throw new Error('Wallet not connected')
      const provider = getProvider(account.chain)
      if (!provider) throw new Error(`Unsupported sign-in chain: ${account.chain}`)
      const statement = generateSiwsStatement({ action, ...context })
      return provider.signIn({ account, statement })
    },
    [account]
  )

  const getAdminBearerHeaders = useCallback(async (): Promise<AdminAuthHeaders> => {
    if (!account) throw new Error('Wallet not connected')

    const cached = readAdminToken(account.chain, account.address)
    if (cached) {
      return { Authorization: `Bearer ${cached}` }
    }

    // No valid token — sign once with the existing admin-action statement,
    // exchange via POST /api/admin/session for a short-lived bearer token,
    // and cache it for the rest of this session.
    const provider = getProvider(account.chain)
    if (!provider) throw new Error(`Unsupported sign-in chain: ${account.chain}`)
    const statement = generateSiwsStatement({ action: 'admin-action' })
    const siwsHeader = await provider.signIn({ account, statement })

    try {
      const res = await fetch(`${API_BASE_URL}/admin/session`, {
        method: 'POST',
        headers: { 'x-siws-auth': siwsHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        // Session exchange failed — fall back to one-shot SIWS so the action
        // still goes through. The caller passes the raw SIWS header instead.
        return { 'x-siws-auth': siwsHeader }
      }
      const body = (await res.json()) as {
        status: string
        data: { token: string; expiresAt: string; chain: string; address: string }
      }
      if (!body?.data?.token) {
        return { 'x-siws-auth': siwsHeader }
      }
      writeAdminToken({
        chain: account.chain,
        address: account.address,
        token: body.data.token,
        expiresAt: body.data.expiresAt,
      })
      return { Authorization: `Bearer ${body.data.token}` }
    } catch {
      // Network error — fall back to the SIWS one-shot so the caller still wins.
      return { 'x-siws-auth': siwsHeader }
    }
  }, [account])

  const disconnect = useCallback(() => {
    if (account) {
      clearAdminToken(account.chain, account.address)
    } else {
      clearAdminToken()
    }
    setAccount(null)
    setAccounts([])
    setError('')
    try {
      sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }, [account])

  return {
    chain,
    setChain,
    account,
    accounts,
    isConnecting,
    error,
    isAvailable,
    connect,
    selectAccount,
    signAction,
    getAdminBearerHeaders,
    disconnect,
  }
}
