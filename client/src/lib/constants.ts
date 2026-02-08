// Get admin addresses from environment variable
const adminAddressesEnv = import.meta.env.VITE_ADMIN_ADDRESSES || ''

export const ADMIN_ADDRESSES = adminAddressesEnv
  .split(',')
  .map(addr => addr.trim().toLowerCase())
  .filter(addr => addr.length > 0)

/**
 * Check if wallet address has admin access
 */
export const isAdmin = (walletAddress?: string): boolean => {
  if (!walletAddress) return false
  
  const normalized = walletAddress.toLowerCase()
  return ADMIN_ADDRESSES.includes(normalized)
}

