import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
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
    } catch (error) {
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
          <DialogTitle>Submit Milestone 2 Deliverables</DialogTitle>
          <DialogDescription>
            {projectTitle}
          </DialogDescription>
        </DialogHeader>
        
        <Alert className="bg-yellow-500/10 border-yellow-500">
          <AlertDescription>
            This marks your M2 as complete and ready for review. Make sure all work is finished before submitting.
          </AlertDescription>
        </Alert>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="repoUrl">GitHub Repository *</Label>
            <Input 
              id="repoUrl"
              placeholder="https://github.com/your-username/your-repo"
              value={formData.repoUrl}
              onChange={(e) => setFormData({...formData, repoUrl: e.target.value})}
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <Label htmlFor="demoUrl">Demo Video URL *</Label>
            <Input 
              id="demoUrl"
              placeholder="https://youtube.com/... or https://loom.com/..."
              value={formData.demoUrl}
              onChange={(e) => setFormData({...formData, demoUrl: e.target.value})}
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              YouTube, Loom, or any public video link
            </p>
          </div>
          
          <div>
            <Label htmlFor="docsUrl">Documentation URL *</Label>
            <Input 
              id="docsUrl"
              placeholder="Link to README, docs site, or Notion page"
              value={formData.docsUrl}
              onChange={(e) => setFormData({...formData, docsUrl: e.target.value})}
              required
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <Label htmlFor="summary">Brief Summary *</Label>
            <Textarea 
              id="summary"
              placeholder="What did you build? What features are complete?"
              rows={4}
              value={formData.summary}
              onChange={(e) => setFormData({...formData, summary: e.target.value})}
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              2-3 sentences describing your completed work
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <Checkbox 
              id="confirm"
              checked={formData.confirmed}
              onCheckedChange={(checked) => setFormData({...formData, confirmed: checked as boolean})}
              disabled={isSubmitting}
            />
            <Label htmlFor="confirm" className="text-sm cursor-pointer">
              I confirm that our team has completed the agreed M2 scope and this work is ready for review.
            </Label>
          </div>
          
          <div className="flex gap-2 justify-end pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting || !formData.confirmed}
            >
              {isSubmitting ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

