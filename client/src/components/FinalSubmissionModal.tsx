import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

export interface SubmissionData {
  finalRepoUrl: string;
  finalDemoUrl?: string;
  finalSlidesUrl?: string;
  summary: string;
  deliverables: string[];
  technicalDetails: string;
  testingInstructions?: string;
  notes?: string;
  agreedToTerms: boolean;
}

interface FinalSubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SubmissionData) => Promise<void>;
}

export const FinalSubmissionModal = ({ open, onOpenChange, onSubmit }: FinalSubmissionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Form state
  const [finalRepoUrl, setFinalRepoUrl] = useState("");
  const [finalDemoUrl, setFinalDemoUrl] = useState("");
  const [finalSlidesUrl, setFinalSlidesUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>([""]);
  const [technicalDetails, setTechnicalDetails] = useState("");
  const [testingInstructions, setTestingInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleAddDeliverable = () => {
    setDeliverables([...deliverables, ""]);
  };

  const handleRemoveDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const handleUpdateDeliverable = (index: number, value: string) => {
    setDeliverables(deliverables.map((d, i) => (i === index ? value : d)));
  };

  const handleSubmit = async () => {
    setError("");
    
    // Validation
    if (!finalRepoUrl.trim()) {
      setError("Final repository URL is required");
      return;
    }
    if (!summary.trim()) {
      setError("Summary is required");
      return;
    }
    if (deliverables.filter(d => d.trim()).length === 0) {
      setError("At least one deliverable is required");
      return;
    }
    if (!technicalDetails.trim()) {
      setError("Technical details are required");
      return;
    }
    if (!agreedToTerms) {
      setError("You must agree to the terms to submit");
      return;
    }

    setLoading(true);
    try {
      const submissionData: SubmissionData = {
        finalRepoUrl: finalRepoUrl.trim(),
        finalDemoUrl: finalDemoUrl.trim() || undefined,
        finalSlidesUrl: finalSlidesUrl.trim() || undefined,
        summary: summary.trim(),
        deliverables: deliverables.filter(d => d.trim()),
        technicalDetails: technicalDetails.trim(),
        testingInstructions: testingInstructions.trim() || undefined,
        notes: notes.trim() || undefined,
        agreedToTerms,
      };
      
      await onSubmit(submissionData);
      
      // Reset form on success
      setFinalRepoUrl("");
      setFinalDemoUrl("");
      setFinalSlidesUrl("");
      setSummary("");
      setDeliverables([""]);
      setTechnicalDetails("");
      setTestingInstructions("");
      setNotes("");
      setAgreedToTerms(false);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">🚀 Submit M2 Deliverables</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Final Repository URL */}
          <div className="space-y-2">
            <Label htmlFor="finalRepoUrl">
              Final Repository URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="finalRepoUrl"
              type="url"
              placeholder="https://github.com/your-org/final-repo"
              value={finalRepoUrl}
              onChange={(e) => setFinalRepoUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Final Demo URL */}
          <div className="space-y-2">
            <Label htmlFor="finalDemoUrl">Final Demo URL (optional)</Label>
            <Input
              id="finalDemoUrl"
              type="url"
              placeholder="https://demo.example.com"
              value={finalDemoUrl}
              onChange={(e) => setFinalDemoUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Final Slides URL */}
          <div className="space-y-2">
            <Label htmlFor="finalSlidesUrl">Final Slides URL (optional)</Label>
            <Input
              id="finalSlidesUrl"
              type="url"
              placeholder="https://slides.example.com"
              value={finalSlidesUrl}
              onChange={(e) => setFinalSlidesUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">
              Summary <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="summary"
              placeholder="Brief summary of your M2 submission..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Deliverables */}
          <div className="space-y-2">
            <Label>
              Deliverables <span className="text-destructive">*</span>
            </Label>
            <div className="space-y-2">
              {deliverables.map((deliverable, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Deliverable ${index + 1}`}
                    value={deliverable}
                    onChange={(e) => handleUpdateDeliverable(index, e.target.value)}
                    disabled={loading}
                  />
                  {deliverables.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveDeliverable(index)}
                      disabled={loading}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDeliverable}
                disabled={loading}
              >
                + Add Deliverable
              </Button>
            </div>
          </div>

          {/* Technical Details */}
          <div className="space-y-2">
            <Label htmlFor="technicalDetails">
              Technical Details <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="technicalDetails"
              placeholder="Describe the technical implementation, architecture, and key features..."
              value={technicalDetails}
              onChange={(e) => setTechnicalDetails(e.target.value)}
              disabled={loading}
              rows={5}
            />
          </div>

          {/* Testing Instructions */}
          <div className="space-y-2">
            <Label htmlFor="testingInstructions">Testing Instructions (optional)</Label>
            <Textarea
              id="testingInstructions"
              placeholder="How to test your submission..."
              value={testingInstructions}
              onChange={(e) => setTestingInstructions(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-2">
            <Checkbox
              id="agreedToTerms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              disabled={loading}
            />
            <Label htmlFor="agreedToTerms" className="text-sm cursor-pointer">
              I confirm that this submission is complete and ready for review. I understand that once submitted, changes may require mentor approval. <span className="text-destructive">*</span>
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit for Review"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

