import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface TeamAddressListProps {
  teamMembers: Array<{
    name: string
    walletAddress: string
    role?: string
    twitter?: string
    github?: string
    linkedin?: string
  }>
  payoutAddress?: string
}

export function TeamAddressList({ teamMembers, payoutAddress }: TeamAddressListProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied!`)
  }

  const copyAllAddresses = () => {
    const addresses = teamMembers.map(m => `${m.name}: ${m.walletAddress}`).join('\n')
    navigator.clipboard.writeText(addresses)
    toast.success(`All ${teamMembers.length} addresses copied!`)
  }

  return (
    <div className="space-y-3">
      {/* Copy All Button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {teamMembers.length} team {teamMembers.length === 1 ? 'member' : 'members'}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={copyAllAddresses}
        >
          <Copy className="h-3 w-3 mr-2" />
          Copy All Addresses
        </Button>
      </div>

      {/* Team Members */}
      <div className="space-y-2">
        {teamMembers.map((member, idx) => (
          <div 
            key={idx}
            className="flex items-start gap-3 p-3 bg-card border rounded-lg hover:bg-muted/30 transition-colors"
          >
            {/* Member Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-sm">{member.name}</p>
                {member.role && (
                  <Badge variant="secondary" className="text-xs">
                    {member.role}
                  </Badge>
                )}
              </div>
              
              {/* Wallet Address */}
              <div className="flex items-center gap-2 mb-2">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                  {member.walletAddress}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => copyToClipboard(member.walletAddress, `${member.name}'s address`)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              {/* Social Links */}
              {(member.twitter || member.github || member.linkedin) && (
                <div className="flex gap-2">
                  {member.twitter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => window.open(member.twitter.startsWith('http') ? member.twitter : `https://twitter.com/${member.twitter.replace('@', '')}`, '_blank')}
                    >
                      🐦 Twitter
                    </Button>
                  )}
                  {member.github && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => window.open(member.github.startsWith('http') ? member.github : `https://github.com/${member.github}`, '_blank')}
                    >
                      💻 GitHub
                    </Button>
                  )}
                  {member.linkedin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => window.open(member.linkedin.startsWith('http') ? member.linkedin : `https://linkedin.com/in/${member.linkedin}`, '_blank')}
                    >
                      💼 LinkedIn
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Payout Address Highlight */}
      {payoutAddress && (
        <div className="mt-4 p-3 bg-primary/5 border-2 border-primary/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-primary">💰 Designated Payout Address</p>
            {teamMembers.some(m => m.walletAddress === payoutAddress) && (
              <Badge variant="outline" className="bg-green-500/10 border-green-500 text-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified Team Member
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-background/50 px-2 py-1 rounded font-mono break-all flex-1">
              {payoutAddress}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0"
              onClick={() => copyToClipboard(payoutAddress, 'Payout address')}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          {!teamMembers.some(m => m.walletAddress === payoutAddress) && (
            <p className="text-xs text-orange-500 mt-2">
              ⚠️ Warning: Payout address is not a team member wallet
            </p>
          )}
        </div>
      )}
    </div>
  )
}

