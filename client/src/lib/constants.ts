// Get admin addresses from environment variable
const adminAddressesEnv = import.meta.env.VITE_ADMIN_ADDRESSES || ''

export const ADMIN_ADDRESSES = adminAddressesEnv
  .split(',')
  .map(addr => addr.trim().toLowerCase())
  .filter(addr => addr.length > 0)

// Debug logging (remove in production)
if (typeof window !== 'undefined') {
  console.log('[constants] VITE_ADMIN_ADDRESSES env:', import.meta.env.VITE_ADMIN_ADDRESSES)
  console.log('[constants] ADMIN_ADDRESSES parsed:', ADMIN_ADDRESSES)
}

/**
 * Check if wallet address has admin access
 */
export const isAdmin = (walletAddress?: string): boolean => {
  if (!walletAddress) return false
  
  const normalized = walletAddress.toLowerCase()
  const isAdminResult = ADMIN_ADDRESSES.includes(normalized)
  
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('[constants] Checking admin access:', {
      walletAddress,
      normalized,
      adminAddresses: ADMIN_ADDRESSES,
      isAdmin: isAdminResult
    })
  }
  
  return isAdminResult
}

