import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  AlertTriangle, 
  Copy,
  CheckCircle2,
  Users,
  DollarSign
} from "lucide-react"
import { toast } from "sonner"

interface ConfirmM1PayoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: {
    id: string
    projectName: string
    teamMembers?: Array<{
      name: string
      walletAddress?: string
      role?: string
    }>
    totalPaid?: Array<{
      milestone: 'M1' | 'M2'
      amount: number
      currency: string
      transactionProof: string
    }>
  }
  onConfirm: (data: M1PayoutConfirmation) => Promise<void>
}

interface M1PayoutConfirmation {
  milestone: 'M1'
  recipients: Array<{
    address: string
    amount: number
    name: string
  }>
  totalAmount: number
  currency: 'USDC'
  transactionProof: string
}

export function ConfirmM1PayoutModal({
  open,
  onOpenChange,
  project,
  onConfirm,
}: ConfirmM1PayoutModalProps) {
  const [loading, setLoading] = useState(false)
  const [totalAmount, setTotalAmount] = useState(2000)
  const [transactionProof, setTransactionProof] = useState('https://assethub-polkadot.subscan.io/extrinsic/0x1234567890abcdef')

  // Check if M1 already paid
  const m1Paid = project.totalPaid?.some(p => p.milestone === 'M1')

  // Get recipients with wallet addresses
  const recipients = useMemo(() => {
    return (project.teamMembers || [])
      .filter(member => member.walletAddress)
      .map(member => ({
        name: member.name,
        address: member.walletAddress!,
        role: member.role,
      }))
  }, [project.teamMembers])

  // Calculate equal split with rounding adjustment for last recipient
  const recipientPayments = useMemo(() => {
    if (recipients.length === 0) return []
    
    const baseAmount = Math.floor(totalAmount / recipients.length * 100) / 100 // Round down to 2 decimals
    const totalDistributed = baseAmount * (recipients.length - 1)
    const lastAmount = totalAmount - totalDistributed // Last person gets remainder
    
    return recipients.map((recipient, index) => ({
      ...recipient,
      amount: index === recipients.length - 1 ? lastAmount : baseAmount
    }))
  }, [recipients, totalAmount])

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast.success('Address copied!')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (recipients.length === 0) {
      toast.error('No team members with wallet addresses found')
      return
    }

    if (!transactionProof) {
      toast.error('Transaction proof URL is required')
      return
    }

    if (!transactionProof.startsWith('http')) {
      toast.error('Please enter a valid URL')
      return
    }

    if (totalAmount <= 0) {
      toast.error('Total amount must be greater than 0')
      return
    }

    setLoading(true)
    try {
      await onConfirm({
        milestone: 'M1',
        recipients: recipientPayments.map(r => ({
          address: r.address,
          amount: r.amount,
          name: r.name
        })),
        totalAmount,
        currency: 'USDC',
        transactionProof,
      })
      toast.success('M1 payout confirmed successfully!')
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm payout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Confirm M1 Winner Payout
          </DialogTitle>
          <DialogDescription>
            Distribute M1 hackathon winnings to {project.projectName} team members
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Info */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Project:</span>
              <span className="text-sm">{project.projectName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Payment Type:</span>
              <Badge variant="outline" className="bg-blue-500/10 border-blue-500 text-blue-500">
                M1 - Hackathon Winner Payout
              </Badge>
            </div>
          </div>

          {/* M1 Payment Status Alert */}
          {m1Paid ? (
            <Alert className="border-green-500 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription>
                <strong>M1 payment already recorded.</strong> This project has already received the M1 payout.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                <strong>Equal Split:</strong> The total amount will be divided equally among all team members with wallet addresses.
              </AlertDescription>
            </Alert>
          )}

          {/* No Recipients Warning */}
          {recipients.length === 0 && (
            <Alert className="border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>No wallet addresses found.</strong> No team members have wallet addresses configured. Payment cannot be processed.
              </AlertDescription>
            </Alert>
          )}

          {/* Total Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="totalAmount">
              Total Amount (USDC) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="totalAmount"
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              placeholder="2000"
              min="1"
              step="0.01"
              required
              disabled={m1Paid}
            />
            {recipients.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Split: ${totalAmount.toLocaleString()} ÷ {recipients.length} = ${(totalAmount / recipients.length).toFixed(2)} per member
              </p>
            )}
          </div>

          {/* Recipients Table */}
          {recipients.length > 0 && (
            <div className="space-y-2">
              <Label>Recipients ({recipients.length})</Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[30%]">Name</TableHead>
                      <TableHead className="w-[20%]">Role</TableHead>
                      <TableHead className="w-[35%]">Wallet Address</TableHead>
                      <TableHead className="w-[15%] text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipientPayments.map((recipient, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{recipient.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {recipient.role || 'Member'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                              {recipient.address.slice(0, 10)}...{recipient.address.slice(-8)}
                            </code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyAddress(recipient.address)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${recipient.amount.toFixed(2)}
                          {index === recipientPayments.length - 1 && recipientPayments.length > 1 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (rounded)
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell colSpan={3} className="text-right">Total:</TableCell>
                      <TableCell className="text-right">
                        ${totalAmount.toFixed(2)} USDC
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}


          {/* Warning */}
          {!m1Paid && recipients.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Important:</strong> Make sure you've completed the batch payment to all {recipients.length} recipients before confirming.
                This will mark M1 as paid for this project.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || m1Paid || recipients.length === 0}
            >
              {loading ? 'Confirming...' : 'Confirm M1 Payout'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

