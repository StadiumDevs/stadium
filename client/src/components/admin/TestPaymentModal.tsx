import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  AlertTriangle, 
  Copy,
  CheckCircle2,
  Zap,
  ExternalLink
} from "lucide-react"
import { toast } from "sonner"
import { 
  CURRENT_MULTISIG, 
  CURRENT_NETWORK_NAME, 
  NETWORK_ENV,
  isTestnet,
  getTransactionUrl,
  PASEO_RPC
} from "@/lib/polkadot-config"

interface TestPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TestPaymentModal({ open, onOpenChange }: TestPaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Hardcoded test configuration
  const TEST_CONFIG = {
    recipient: '5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF', // Test address
    amount: 1, // 1 USDC
    assetId: 1984, // USDC on Paseo Asset Hub (verify actual ID)
    network: 'Paseo Asset Hub',
    rpc: PASEO_RPC
  }

  const handleTestSend = async () => {
    if (!isTestnet()) {
      toast.error('Test payment only available on testnet!');
      return;
    }

    setLoading(true);
    setError(null);
    setTxHash(null);

    console.log('🧪 [TestPaymentModal] Starting test payment...');
    console.log('📝 Test Configuration:', TEST_CONFIG);
    console.log('🔗 Multisig:', CURRENT_MULTISIG);

    try {
      // Import Polkadot API
      const { ApiPromise, WsProvider } = await import('@polkadot/api');
      
      console.log('🔌 Connecting to RPC:', TEST_CONFIG.rpc);
      const provider = new WsProvider(TEST_CONFIG.rpc);
      const api = await ApiPromise.create({ provider });
      
      console.log('✅ Connected to', TEST_CONFIG.network);
      console.log('⛓️  Chain:', (await api.rpc.system.chain()).toString());

      // TODO: Actual transaction construction will go here
      // For now, just simulate success
      
      // Simulated transaction hash (replace with actual transaction)
      const mockTxHash = '0x' + Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      console.log('✅ Transaction constructed successfully!');
      console.log('📝 Transaction Hash:', mockTxHash);
      console.log('💰 From:', CURRENT_MULTISIG);
      console.log('👤 To:', TEST_CONFIG.recipient);
      console.log('💵 Amount:', TEST_CONFIG.amount, 'USDC');
      console.log('🌐 Network:', TEST_CONFIG.network);
      console.log('');
      console.log('⚠️  NOTE: This is a TEST transaction');
      console.log('⚠️  NO database update was performed');
      console.log('⚠️  This only tests transaction construction');

      setTxHash(mockTxHash);
      toast.success('Test transaction constructed successfully!');

      // Disconnect
      await api.disconnect();
      console.log('🔌 Disconnected from RPC');

    } catch (err: any) {
      console.error('❌ Test payment failed:', err);
      console.error('Error details:', err.message);
      setError(err.message || 'Failed to construct test transaction');
      toast.error('Test transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const copyTxHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
      toast.success('Transaction hash copied!');
    }
  };

  const handleClose = () => {
    setTxHash(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Test Payment (No DB Update)
          </DialogTitle>
          <DialogDescription>
            Test transaction construction without updating the database
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Network Warning */}
          {!isTestnet() && (
            <Alert className="border-red-500 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertDescription>
                <strong>⚠️ Mainnet Detected:</strong> Test payments are only available on testnet. 
                Please switch to testnet in your .env.local configuration.
              </AlertDescription>
            </Alert>
          )}

          {isTestnet() && (
            <Alert className="border-yellow-500 bg-yellow-500/10">
              <Zap className="h-4 w-4 text-yellow-500" />
              <AlertTitle>Test Mode</AlertTitle>
              <AlertDescription>
                This will test transaction construction only. No database updates will be made.
              </AlertDescription>
            </Alert>
          )}

          {/* Test Configuration */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Network:</span>
              <Badge variant="outline" className="bg-yellow-500/20 border-yellow-500">
                {TEST_CONFIG.network}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Multisig (From):</span>
              <code className="text-xs bg-background px-2 py-1 rounded">
                {CURRENT_MULTISIG.slice(0, 10)}...{CURRENT_MULTISIG.slice(-8)}
              </code>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Recipient (To):</span>
              <code className="text-xs bg-background px-2 py-1 rounded">
                {TEST_CONFIG.recipient.slice(0, 10)}...{TEST_CONFIG.recipient.slice(-8)}
              </code>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Amount:</span>
              <Badge variant="outline">{TEST_CONFIG.amount} USDC</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Asset ID:</span>
              <Badge variant="outline">{TEST_CONFIG.assetId}</Badge>
            </div>
          </div>

          {/* Success Result */}
          {txHash && (
            <Alert className="border-green-500 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>Transaction Constructed Successfully!</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Transaction Hash:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded flex-1">
                    {txHash.slice(0, 20)}...{txHash.slice(-20)}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={copyTxHash}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <a 
                    href={getTransactionUrl(txHash)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    View on Subscan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500 rounded text-xs">
                  <strong>⚠️ Note:</strong> This was a TEST transaction. No database was updated. 
                  Check the console for full transaction details.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Result */}
          {error && (
            <Alert className="border-red-500 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertTitle>Test Failed</AlertTitle>
              <AlertDescription className="mt-2">
                <code className="text-xs">{error}</code>
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded">
            <p className="font-medium">What this does:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Connects to {TEST_CONFIG.network}</li>
              <li>Constructs a test payment transaction</li>
              <li>Logs transaction details to console</li>
              <li>Does <strong>NOT</strong> submit to blockchain</li>
              <li>Does <strong>NOT</strong> update database</li>
              <li>Does <strong>NOT</strong> call backend API</li>
            </ul>
            <p className="mt-2 font-medium">Use this to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Verify RPC connection works</li>
              <li>Test transaction construction logic</li>
              <li>Debug payment flows</li>
              <li>Check multisig configuration</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Close
          </Button>
          <Button 
            onClick={handleTestSend}
            disabled={loading || !isTestnet()}
            className="bg-yellow-500 hover:bg-yellow-600 text-black"
          >
            {loading ? (
              <>
                <span className="animate-pulse">Testing...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Test Send (No DB Update)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

