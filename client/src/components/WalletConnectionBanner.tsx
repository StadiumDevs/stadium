import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Wallet, X } from "lucide-react";
import type { Chain } from "@/lib/auth/types";
import { ChainPicker } from "@/components/auth/ChainPicker";

interface WalletConnectionBannerProps {
  onConnect: () => void;
  isConnected: boolean;
  /** When provided, a chain picker is shown so the user can choose an ecosystem. */
  chain?: Chain;
  onChainChange?: (chain: Chain) => void;
}

export function WalletConnectionBanner({
  onConnect,
  isConnected,
  chain,
  onChainChange,
}: WalletConnectionBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Check if banner was dismissed in session
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('wallet-banner-dismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
    }
  }, []);

  // Clear dismissal when wallet connects
  useEffect(() => {
    if (isConnected) {
      sessionStorage.removeItem('wallet-banner-dismissed');
      setDismissed(false);
    }
  }, [isConnected]);

  const handleDismiss = () => {
    sessionStorage.setItem('wallet-banner-dismissed', 'true');
    setDismissed(true);
  };

  // Don't show if connected or dismissed
  if (isConnected || dismissed) return null;

  const showChainPicker = chain !== undefined && onChainChange !== undefined;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Alert className="mb-6 border-primary/50 bg-primary/10">
          <Wallet className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-4">
            <span className="flex-1 min-w-[16rem]">
              Connect your wallet to update team details, milestone deliverables and manage payment information. Contact WebZero if you are having trouble signing in.
            </span>
            <div className="flex items-center gap-2">
              {showChainPicker && (
                <ChainPicker value={chain} onChange={onChainChange} />
              )}
              <Button
                size="sm"
                onClick={onConnect}
                className="bg-primary hover:bg-primary/90"
              >
                Connect Wallet
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}
