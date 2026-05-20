import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface SubmissionData {
  repoUrl: string;
  demoUrl: string;
  docsUrl: string;
  summary: string;
  confirmed: boolean;
}

interface FinalSubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  onSubmit: (data: SubmissionData) => Promise<void>;
}

export function FinalSubmissionModal({ 
  open, 
  onOpenChange, 
  projectId,
  projectTitle,
  onSubmit 
}: FinalSubmissionModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<SubmissionData>({
    repoUrl: '',
    demoUrl: '',
    docsUrl: '',
    summary: '',
    confirmed: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.confirmed) {
      toast({
        title: "Error",
        description: "Please confirm your submission",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast({
        title: "Success",
        description: "M2 deliverables submitted successfully!",
      });
      // Reset form
      setFormData({
        repoUrl: '',
        demoUrl: '',
        docsUrl: '',
        summary: '',
        confirmed: false
      });
      onOpenChange(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to submit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">SUBMIT MILESTONE 2 DELIVERABLES</DialogTitle>
          <DialogDescription className="text-body">
            {projectTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="lcd p-3 flex items-start gap-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-display flex-shrink-0 mt-0.5" />
          <p className="label-hw text-display">
            ·MARKS YOUR M2 AS COMPLETE AND READY FOR REVIEW. CONFIRM ALL WORK IS FINISHED BEFORE SUBMITTING.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="repoUrl" className="label-hw-dim">·GITHUB REPOSITORY *</Label>
            <Input
              id="repoUrl"
              placeholder="https://github.com/your-username/your-repo"
              value={formData.repoUrl}
              onChange={(e) => setFormData({...formData, repoUrl: e.target.value})}
              required
              disabled={isSubmitting}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="demoUrl" className="label-hw-dim">·DEMO VIDEO URL *</Label>
            <Input
              id="demoUrl"
              placeholder="https://youtube.com/… or https://loom.com/…"
              value={formData.demoUrl}
              onChange={(e) => setFormData({...formData, demoUrl: e.target.value})}
              required
              disabled={isSubmitting}
              className="font-mono text-sm"
            />
            <p className="label-hw-dim">YOUTUBE, LOOM, OR ANY PUBLIC VIDEO LINK</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="docsUrl" className="label-hw-dim">·DOCUMENTATION URL *</Label>
            <Input
              id="docsUrl"
              placeholder="Link to README, docs site, or Notion page"
              value={formData.docsUrl}
              onChange={(e) => setFormData({...formData, docsUrl: e.target.value})}
              required
              disabled={isSubmitting}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="summary" className="label-hw-dim">·BRIEF SUMMARY *</Label>
            <Textarea
              id="summary"
              placeholder="What did you build? What features are complete?"
              rows={4}
              value={formData.summary}
              onChange={(e) => setFormData({...formData, summary: e.target.value})}
              required
              disabled={isSubmitting}
              className="font-mono text-sm"
            />
            <p className="label-hw-dim">2–3 SENTENCES DESCRIBING YOUR COMPLETED WORK</p>
          </div>

          <div className="flex items-start gap-2 lcd p-3">
            <Checkbox
              id="confirm"
              checked={formData.confirmed}
              onCheckedChange={(checked) => setFormData({...formData, confirmed: checked as boolean})}
              disabled={isSubmitting}
              className="mt-0.5"
            />
            <Label htmlFor="confirm" className="text-sm cursor-pointer text-body">
              I confirm that our team has completed the agreed M2 scope and this work is ready for review.
            </Label>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-hairline-subtle">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.confirmed}
              className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5"
            >
              {isSubmitting ? 'SUBMITTING…' : 'SUBMIT FOR REVIEW ▸'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

