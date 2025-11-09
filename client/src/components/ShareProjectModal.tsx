import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
    } catch (error) {
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
          <DialogTitle>Share Project</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Social Share Buttons */}
          <div className="space-y-2">
            <Label>Share on social media</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(twitterUrl, '_blank', 'noopener,noreferrer')}
              >
                <Twitter className="w-4 h-4 mr-2" aria-hidden="true" />
                Twitter
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open(linkedinUrl, '_blank', 'noopener,noreferrer')}
              >
                <Linkedin className="w-4 h-4 mr-2" aria-hidden="true" />
                LinkedIn
              </Button>
            </div>
          </div>
          
          {/* Copy Link */}
          <div className="space-y-2">
            <Label htmlFor="share-url">Or copy link</Label>
            <div className="flex gap-2">
              <Input 
                id="share-url"
                value={fullUrl}
                readOnly
                className="flex-1"
                aria-label="Project URL"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label={copied ? "Link copied" : "Copy link"}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
                ) : (
                  <Copy className="w-4 h-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

