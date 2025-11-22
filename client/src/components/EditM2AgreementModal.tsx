import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Loader2, AlertCircle, Info } from "lucide-react";

interface M2Agreement {
  mentorName?: string;
  agreedDate: string;
  agreedFeatures: string[];
  documentation?: string[];
  successCriteria?: string;
}

interface EditM2AgreementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentAgreement?: M2Agreement;
  currentWeek: number;
  onSuccess: () => void;
}

export function EditM2AgreementModal({
  open,
  onOpenChange,
  projectId,
  currentAgreement,
  currentWeek,
  onSuccess
}: EditM2AgreementModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [coreFeaturesText, setCoreFeaturesText] = useState('');
  const [documentationText, setDocumentationText] = useState('');
  const [successCriteriaText, setSuccessCriteriaText] = useState('');
  
  // Error state
  const [errors, setErrors] = useState<{
    coreFeatures?: string;
    documentation?: string;
    successCriteria?: string;
  }>({});

  // Character counts
  const coreFeaturesCount = coreFeaturesText.length;
  const documentationCount = documentationText.length;
  const successCriteriaCount = successCriteriaText.length;

  // Max lengths
  const MAX_CORE_FEATURES = 2000;
  const MAX_DOCUMENTATION = 1000;
  const MAX_SUCCESS_CRITERIA = 1000;

  // Check if editing is allowed
  const canEdit = currentWeek >= 1 && currentWeek <= 4;
  const isLocked = currentWeek > 4;

  // Initialize form with current agreement data
  useEffect(() => {
    if (open && currentAgreement) {
      setCoreFeaturesText(currentAgreement.agreedFeatures.join('\n'));
      setDocumentationText(currentAgreement.documentation?.join('\n') || '');
      setSuccessCriteriaText(currentAgreement.successCriteria || '');
      setErrors({});
    } else if (open && !currentAgreement) {
      // Reset form for new agreement
      setCoreFeaturesText('');
      setDocumentationText('');
      setSuccessCriteriaText('');
      setErrors({});
    }
  }, [open, currentAgreement]);

  // Focus first field when modal opens
  useEffect(() => {
    if (open && canEdit) {
      setTimeout(() => {
        document.getElementById('coreFeatures')?.focus();
      }, 100);
    }
  }, [open, canEdit]);

  // Validation
  const validate = () => {
    const newErrors: typeof errors = {};

    if (!coreFeaturesText.trim()) {
      newErrors.coreFeatures = 'Core features are required';
    } else if (coreFeaturesCount > MAX_CORE_FEATURES) {
      newErrors.coreFeatures = `Maximum ${MAX_CORE_FEATURES} characters allowed`;
    }

    if (!documentationText.trim()) {
      newErrors.documentation = 'Documentation requirements are required';
    } else if (documentationCount > MAX_DOCUMENTATION) {
      newErrors.documentation = `Maximum ${MAX_DOCUMENTATION} characters allowed`;
    }

    if (!successCriteriaText.trim()) {
      newErrors.successCriteria = 'Success criteria are required';
    } else if (successCriteriaCount > MAX_SUCCESS_CRITERIA) {
      newErrors.successCriteria = `Maximum ${MAX_SUCCESS_CRITERIA} characters allowed`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse textarea content into arrays
      const agreedFeatures = coreFeaturesText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const documentation = documentationText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const successCriteria = successCriteriaText.trim();

      // Call API to update M2 agreement
      await api.updateM2Agreement(projectId, {
        agreedFeatures,
        documentation,
        successCriteria,
      });

      toast({
        title: "✅ M2 roadmap updated successfully!",
        description: "Your development plan has been saved",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update M2 agreement:', error);
      toast({
        title: "❌ Failed to update roadmap",
        description: "Please try again or contact support if the issue persists",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading">
            {currentAgreement ? 'Edit Your M2 Roadmap' : 'Create Your M2 Roadmap'}
          </DialogTitle>
          <DialogDescription>
            Update your plan for the 6-week accelerator program
          </DialogDescription>
        </DialogHeader>

        {/* Week 4 Lock Alert */}
        {isLocked && (
          <Alert className="bg-amber-500/10 border-amber-500/50">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-600">
              ⚠️ M2 roadmap is locked after Week 4. Contact your mentors in your team chat if you need to make any changes.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Core Features */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="coreFeatures" className="text-base font-semibold">
                Core Features <span className="text-destructive">*</span>
              </Label>
              <span className={`text-sm ${coreFeaturesCount > MAX_CORE_FEATURES ? 'text-destructive' : 'text-muted-foreground'}`}>
                {coreFeaturesCount}/{MAX_CORE_FEATURES}
              </span>
            </div>
            <Textarea
              id="coreFeatures"
              value={coreFeaturesText}
              onChange={(e) => setCoreFeaturesText(e.target.value)}
              placeholder="Enter each feature on a new line...

Example:
Multi-chain portfolio aggregation supporting 20+ parachains with automatic balance updates every 30 seconds
Real-time price feeds integration from major DEXs and CEXs with <5 second refresh rate
Historical performance charts showing 1D, 7D, 30D, 90D, 1Y views with interactive tooltips"
              disabled={isSubmitting || isLocked}
              rows={8}
              className="font-mono text-sm"
            />
            {errors.coreFeatures && (
              <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.coreFeatures}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>List the main features you'll build. Each line becomes a separate feature.</span>
            </p>
          </div>

          {/* Documentation Requirements */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="documentation" className="text-base font-semibold">
                Documentation Requirements <span className="text-destructive">*</span>
              </Label>
              <span className={`text-sm ${documentationCount > MAX_DOCUMENTATION ? 'text-destructive' : 'text-muted-foreground'}`}>
                {documentationCount}/{MAX_DOCUMENTATION}
              </span>
            </div>
            <Textarea
              id="documentation"
              value={documentationText}
              onChange={(e) => setDocumentationText(e.target.value)}
              placeholder="Enter each requirement on a new line...

Example:
Complete README with installation and setup guide
API documentation for all endpoints
Architecture diagram showing system components
User guide with screenshots and tutorials
Deployment guide for production"
              disabled={isSubmitting || isLocked}
              rows={6}
              className="font-mono text-sm"
            />
            {errors.documentation && (
              <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.documentation}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>What documentation will you provide? Each line becomes a separate requirement.</span>
            </p>
          </div>

          {/* Success Criteria */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="successCriteria" className="text-base font-semibold">
                Success Criteria <span className="text-destructive">*</span>
              </Label>
              <span className={`text-sm ${successCriteriaCount > MAX_SUCCESS_CRITERIA ? 'text-destructive' : 'text-muted-foreground'}`}>
                {successCriteriaCount}/{MAX_SUCCESS_CRITERIA}
              </span>
            </div>
            <Textarea
              id="successCriteria"
              value={successCriteriaText}
              onChange={(e) => setSuccessCriteriaText(e.target.value)}
              placeholder="How will we know this M2 is successful?

Example:
Application must successfully track assets across at least 20 parachains, display real-time prices with <5 second latency, support 50+ major tokens, handle 1000+ transactions in history without performance degradation, and provide accurate portfolio value calculations with 99%+ accuracy."
              disabled={isSubmitting || isLocked}
              rows={5}
              className="text-sm"
            />
            {errors.successCriteria && (
              <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.successCriteria}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>Define measurable success metrics for your project.</span>
            </p>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {!isLocked && (
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

