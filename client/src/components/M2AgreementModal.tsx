import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";

export interface M2AgreementData {
  teamName: string;
  coreFeatures: string[];
  documentation: string[];
  demoVideoRequirements: string;
  successCriteria: string;
  niceToHave: string[];
  targetCompletionDate: string;
  mentorName: string;
}

interface M2AgreementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  onSubmit: (data: M2AgreementData) => Promise<void>;
}

export function M2AgreementModal({ 
  open, 
  onOpenChange, 
  projectId,
  projectTitle,
  onSubmit 
}: M2AgreementModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<M2AgreementData>({
    teamName: '',
    coreFeatures: [''],
    documentation: ['README with setup instructions', 'Architecture overview explaining how it works'],
    demoVideoRequirements: '',
    successCriteria: '',
    niceToHave: [''],
    targetCompletionDate: '',
    mentorName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddFeature = () => {
    setFormData(prev => ({
      ...prev,
      coreFeatures: [...prev.coreFeatures, '']
    }));
  };

  const handleRemoveFeature = (index: number) => {
    if (formData.coreFeatures.length > 1) {
      setFormData(prev => ({
        ...prev,
        coreFeatures: prev.coreFeatures.filter((_, i) => i !== index)
      }));
    }
  };

  const handleFeatureChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      coreFeatures: prev.coreFeatures.map((f, i) => i === index ? value : f)
    }));
  };

  const handleAddDocumentation = () => {
    setFormData(prev => ({
      ...prev,
      documentation: [...prev.documentation, '']
    }));
  };

  const handleRemoveDocumentation = (index: number) => {
    if (formData.documentation.length > 1) {
      setFormData(prev => ({
        ...prev,
        documentation: prev.documentation.filter((_, i) => i !== index)
      }));
    }
  };

  const handleDocumentationChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      documentation: prev.documentation.map((d, i) => i === index ? value : d)
    }));
  };

  const handleAddNiceToHave = () => {
    setFormData(prev => ({
      ...prev,
      niceToHave: [...prev.niceToHave, '']
    }));
  };

  const handleRemoveNiceToHave = (index: number) => {
    if (formData.niceToHave.length > 1) {
      setFormData(prev => ({
        ...prev,
        niceToHave: prev.niceToHave.filter((_, i) => i !== index)
      }));
    }
  };

  const handleNiceToHaveChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      niceToHave: prev.niceToHave.map((n, i) => i === index ? value : n)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.teamName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your team name",
        variant: "destructive",
      });
      return;
    }

    if (!formData.coreFeatures.some(f => f.trim())) {
      toast({
        title: "Error",
        description: "Please add at least one core feature",
        variant: "destructive",
      });
      return;
    }

    if (!formData.successCriteria.trim()) {
      toast({
        title: "Error",
        description: "Please enter success criteria",
        variant: "destructive",
      });
      return;
    }

    if (!formData.mentorName.trim()) {
      toast({
        title: "Error",
        description: "Please enter mentor name",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        coreFeatures: formData.coreFeatures.filter(f => f.trim()),
        documentation: formData.documentation.filter(d => d.trim()),
        niceToHave: formData.niceToHave.filter(n => n.trim())
      });
      toast({
        title: "Success",
        description: "M2 Agreement submitted successfully!",
      });
      // Reset form
      setFormData({
        teamName: '',
        coreFeatures: [''],
        documentation: ['README with setup instructions', 'Architecture overview explaining how it works'],
        demoVideoRequirements: '',
        successCriteria: '',
        niceToHave: [''],
        targetCompletionDate: '',
        mentorName: ''
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload M2 Agreement</DialogTitle>
          <DialogDescription>
            Fill out your Milestone 2 Agreement template. This will be used to evaluate your final submission.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team Name */}
          <div>
            <Label htmlFor="teamName">
              Team Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="teamName"
              value={formData.teamName}
              onChange={(e) => setFormData(prev => ({ ...prev, teamName: e.target.value }))}
              placeholder="Your team name"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Core Features */}
          <div>
            <Label>
              Core Features (must complete 80%+) <span className="text-destructive">*</span>
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              List specific features with acceptance criteria
            </p>
            <div className="space-y-2">
              {formData.coreFeatures.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={feature}
                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                    placeholder={`Feature ${index + 1}: [Specific feature description with acceptance criteria]`}
                    disabled={isSubmitting}
                  />
                  {formData.coreFeatures.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFeature(index)}
                      disabled={isSubmitting}
                      aria-label="Remove feature"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddFeature}
              disabled={isSubmitting}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Feature
            </Button>
          </div>

          {/* Documentation */}
          <div>
            <Label>Documentation Required</Label>
            <div className="space-y-2">
              {formData.documentation.map((doc, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={doc}
                    onChange={(e) => handleDocumentationChange(index, e.target.value)}
                    placeholder="Documentation item"
                    disabled={isSubmitting}
                  />
                  {formData.documentation.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDocumentation(index)}
                      disabled={isSubmitting}
                      aria-label="Remove documentation"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddDocumentation}
              disabled={isSubmitting}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Documentation Item
            </Button>
          </div>

          {/* Demo Video Requirements */}
          <div>
            <Label htmlFor="demoVideoRequirements">Demo Video Requirements</Label>
            <Textarea
              id="demoVideoRequirements"
              value={formData.demoVideoRequirements}
              onChange={(e) => setFormData(prev => ({ ...prev, demoVideoRequirements: e.target.value }))}
              placeholder="2-3 minutes. Must show: [specific aspects]. Should explain: [specific value proposition]"
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          {/* Success Criteria */}
          <div>
            <Label htmlFor="successCriteria">
              Success Criteria <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="successCriteria"
              value={formData.successCriteria}
              onChange={(e) => setFormData(prev => ({ ...prev, successCriteria: e.target.value }))}
              placeholder="Specific measurable outcomes and quality bars (one per line)"
              disabled={isSubmitting}
              rows={4}
              required
            />
          </div>

          {/* Nice to Have */}
          <div>
            <Label>Nice-to-Have (not required for approval)</Label>
            <div className="space-y-2">
              {formData.niceToHave.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => handleNiceToHaveChange(index, e.target.value)}
                    placeholder="Optional feature"
                    disabled={isSubmitting}
                  />
                  {formData.niceToHave.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveNiceToHave(index)}
                      disabled={isSubmitting}
                      aria-label="Remove nice-to-have"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddNiceToHave}
              disabled={isSubmitting}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Nice-to-Have
            </Button>
          </div>

          {/* Target Completion Date */}
          <div>
            <Label htmlFor="targetCompletionDate">Target Completion Date</Label>
            <Input
              id="targetCompletionDate"
              type="date"
              value={formData.targetCompletionDate}
              onChange={(e) => setFormData(prev => ({ ...prev, targetCompletionDate: e.target.value }))}
              disabled={isSubmitting}
            />
          </div>

          {/* Mentor Name */}
          <div>
            <Label htmlFor="mentorName">
              Mentor Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mentorName"
              value={formData.mentorName}
              onChange={(e) => setFormData(prev => ({ ...prev, mentorName: e.target.value }))}
              placeholder="@mentor-username"
              disabled={isSubmitting}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit M2 Agreement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

