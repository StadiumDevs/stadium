import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Twitter, Linkedin, Copy, Check } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface ShareProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectTitle: string
  projectUrl: string
}

export function ShareProjectModal({
  open,
  onOpenChange,
  projectTitle,
  projectUrl
}: ShareProjectModalProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  
  const fullUrl = `${window.location.origin}${projectUrl}`
  
  const twitterText = `Check out ${projectTitle} - built at sub0 2025 Hackathon! 🚀`
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(fullUrl)}`
  
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      toast({
        title: "Link copied!",
        description: "Project URL copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">SHARE PROJECT</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Social Share Buttons */}
          <div className="space-y-2">
            <Label className="label-hw-dim">·SHARE ON SOCIAL MEDIA</Label>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-2"
                onClick={() => window.open(twitterUrl, '_blank', 'noopener,noreferrer')}
              >
                <Twitter className="w-3 h-3" aria-hidden="true" />
                TWITTER
              </button>
              <button
                type="button"
                className="flex-1 inline-flex items-center justify-center gap-2 font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-2"
                onClick={() => window.open(linkedinUrl, '_blank', 'noopener,noreferrer')}
              >
                <Linkedin className="w-3 h-3" aria-hidden="true" />
                LINKEDIN
              </button>
            </div>
          </div>

          {/* Copy Link */}
          <div className="space-y-2">
            <Label htmlFor="share-url" className="label-hw-dim">·OR COPY LINK</Label>
            <div className="flex gap-2">
              <Input
                id="share-url"
                value={fullUrl}
                readOnly
                className="flex-1 font-mono text-xs"
                aria-label="Project URL"
              />
              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? "Link copied" : "Copy link"}
                className="inline-flex items-center justify-center border border-hairline text-display hover:bg-panel-deep w-9 h-9 flex-shrink-0"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-led" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

