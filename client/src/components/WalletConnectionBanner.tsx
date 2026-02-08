import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Wallet, X } from "lucide-react";

interface WalletConnectionBannerProps {
  onConnect: () => void;
  isConnected: boolean;
}

export function WalletConnectionBanner({ onConnect, isConnected }: WalletConnectionBannerProps) {
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
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="flex-1">
              Connect your wallet to update team details, milestone deliverables and manage payment information. Contact WebZero if you are having trouble signing in.
            </span>
            <div className="flex items-center gap-2">
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

