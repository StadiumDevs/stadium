import { useState, useEffect, useMemo } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

interface ConfirmPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: {
    id: string
    projectName: string
    donationAddress?: string
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
  onConfirm: (data: PaymentConfirmation) => Promise<void>
}

interface PaymentRecipient {
  address: string
  amount: number
  name: string
}

interface PaymentConfirmation {
  milestone: 'M1' | 'M2'
  recipients: PaymentRecipient[]
  totalAmount: number
  currency: 'USDC' | 'DOT'
  transactionProof: string
}

export function ConfirmPaymentModal({
  open,
  onOpenChange,
  project,
  onConfirm,
}: ConfirmPaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [milestone, setMilestone] = useState<'M1' | 'M2'>('M2')
  const [totalAmount, setTotalAmount] = useState(2000)
  const [currency, setCurrency] = useState<'USDC' | 'DOT'>('USDC')
  const [transactionProof, setTransactionProof] = useState('https://assethub-polkadot.subscan.io/extrinsic/0x1234567890abcdef')
  const [recipientAmounts, setRecipientAmounts] = useState<Record<string, number>>({})

  // Check what's already been paid
  const m1Paid = project.totalPaid?.some(p => p.milestone === 'M1')
  const m2Paid = project.totalPaid?.some(p => p.milestone === 'M2')

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

  // Initialize recipient amounts with equal split when modal opens or total changes
  useEffect(() => {
    if (recipients.length > 0 && open) {
      const baseAmount = Math.floor(totalAmount / recipients.length * 100) / 100
      const totalDistributed = baseAmount * (recipients.length - 1)
      const lastAmount = totalAmount - totalDistributed
      
      const initialAmounts: Record<string, number> = {}
      recipients.forEach((recipient, index) => {
        initialAmounts[recipient.address] = index === recipients.length - 1 ? lastAmount : baseAmount
      })
      setRecipientAmounts(initialAmounts)
    }
  }, [recipients, totalAmount, open])

  // Calculate current sum of recipient amounts
  const currentSum = useMemo(() => {
    return Object.values(recipientAmounts).reduce((sum, amount) => sum + amount, 0)
  }, [recipientAmounts])

  // Check if amounts are valid (sum equals total)
  const amountsValid = useMemo(() => {
    return Math.abs(currentSum - totalAmount) < 0.01 // Allow for small rounding errors
  }, [currentSum, totalAmount])

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast.success('Address copied!')
  }

  const updateRecipientAmount = (address: string, amount: number) => {
    setRecipientAmounts(prev => ({
      ...prev,
      [address]: amount
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (recipients.length === 0) {
      toast.error('No team members with wallet addresses found')
      return
    }

    // Enforce M1 must be paid before M2
    if (milestone === 'M2' && !m1Paid) {
      toast.error('M1 payment must be completed before processing M2 payment')
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

    if (!amountsValid) {
      toast.error(`Recipient amounts ($${currentSum.toFixed(2)}) must equal total amount ($${totalAmount.toFixed(2)})`)
      return
    }

    if (totalAmount <= 0) {
      toast.error('Total amount must be greater than 0')
      return
    }

    setLoading(true)
    try {
      const paymentData: PaymentConfirmation = {
        milestone,
        recipients: recipients.map(r => ({
          address: r.address,
          amount: recipientAmounts[r.address] || 0,
          name: r.name
        })),
        totalAmount,
        currency,
        transactionProof,
      }
      
      await onConfirm(paymentData)
      toast.success('Payment confirmed successfully!')
      onOpenChange(false)
      // Reset form
      setMilestone('M2')
      setTotalAmount(2000)
      setCurrency('USDC')
      setTransactionProof('https://assethub-polkadot.subscan.io/extrinsic/0x1234567890abcdef')
      setRecipientAmounts({})
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Confirm Payment
          </DialogTitle>
          <DialogDescription>
            Record payment transaction for {project.projectName}
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
              <span className="text-sm font-medium">Team Members with Wallets:</span>
              <Badge variant="outline">
                <Users className="h-3 w-3 mr-1" />
                {recipients.length}
              </Badge>
            </div>
          </div>

          {/* Payment Status Alert */}
          <Alert>
            <AlertDescription>
              <div className="space-y-1 text-sm">
                <p className="font-medium mb-2">Payment Status:</p>
                <div className="flex items-center gap-2">
                  {m1Paid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted" />
                  )}
                  <span>M1: $2,000 USDC</span>
                  {m1Paid && <Badge variant="outline" className="text-xs">Paid</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  {m2Paid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted" />
                  )}
                  <span>M2: $2,000 USDC</span>
                  {m2Paid && <Badge variant="outline" className="text-xs">Paid</Badge>}
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* No Recipients Warning */}
          {recipients.length === 0 && (
            <Alert className="border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>No wallet addresses found.</strong> No team members have wallet addresses configured. Payment cannot be processed.
              </AlertDescription>
            </Alert>
          )}

          {/* M1 Required for M2 Warning */}
          {!m1Paid && (
            <Alert className="border-yellow-500 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription>
                <strong>M1 Payment Required:</strong> M2 payment cannot be processed until M1 has been paid. Please complete M1 payment first.
              </AlertDescription>
            </Alert>
          )}

          {/* Milestone Selection */}
          <div className="space-y-2">
            <Label htmlFor="milestone">
              Milestone <span className="text-destructive">*</span>
            </Label>
            <Select
              value={milestone}
              onValueChange={(value: 'M1' | 'M2') => setMilestone(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M1" disabled={m1Paid}>
                  M1 - Initial Payment {m1Paid && '(Already paid)'}
                </SelectItem>
                <SelectItem value="M2" disabled={m2Paid || !m1Paid}>
                  M2 - Completion Payment {m2Paid ? '(Already paid)' : !m1Paid ? '(M1 required first)' : ''}
                </SelectItem>
              </SelectContent>
            </Select>
            {!m1Paid && milestone === 'M2' && (
              <p className="text-xs text-yellow-600">
                ⚠️ M2 is locked until M1 payment is completed
              </p>
            )}
          </div>

          {/* Total Amount & Currency */}
          <div className="grid grid-cols-2 gap-4">
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
              />
              {recipients.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Default split: ${totalAmount.toLocaleString()} ÷ {recipients.length} = ${(totalAmount / recipients.length).toFixed(2)} per member
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">
                Currency <span className="text-destructive">*</span>
              </Label>
              <Select
                value={currency}
                onValueChange={(value: 'USDC' | 'DOT') => setCurrency(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="DOT">DOT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recipients Table with Editable Amounts */}
          {recipients.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Recipients & Amounts</Label>
                <Alert className={`${amountsValid ? 'border-green-500 bg-green-500/10' : 'border-destructive bg-destructive/10'} p-2`}>
                  <AlertDescription className="text-xs flex items-center gap-1">
                    {amountsValid ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="text-green-700">Sum matches total</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-destructive">
                          Current sum: ${currentSum.toFixed(2)} (needs: ${totalAmount.toFixed(2)})
                        </span>
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[25%]">Name</TableHead>
                      <TableHead className="w-[15%]">Role</TableHead>
                      <TableHead className="w-[35%]">Wallet Address</TableHead>
                      <TableHead className="w-[25%] text-right">Amount (USDC)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipients.map((recipient, index) => (
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
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={recipientAmounts[recipient.address] || 0}
                            onChange={(e) => updateRecipientAmount(recipient.address, Number(e.target.value))}
                            step="0.01"
                            min="0"
                            className="text-right font-semibold"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell colSpan={3} className="text-right">Total:</TableCell>
                      <TableCell className="text-right">
                        <div className={`${amountsValid ? 'text-green-600' : 'text-destructive'}`}>
                          ${currentSum.toFixed(2)} {currency}
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Amounts are pre-filled with equal split. Edit any amount - they must sum to the total amount above.
              </p>
            </div>
          )}

          {/* Warning for M2 */}
          {milestone === 'M2' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Important:</strong> Confirming M2 payment will mark this project as 
                <strong> Completed</strong> and remove it from the building/review sections.
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
              disabled={loading || recipients.length === 0 || !amountsValid || (milestone === 'M2' && !m1Paid)}
            >
              {loading ? 'Confirming...' : 'Confirm Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

