import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Available categories for selection
const AVAILABLE_CATEGORIES = [
  "AI",
  "DeFi",
  "Gaming",
  "NFT",
  "Social",
  "Developer Tools",
  "Mobile",
  "Arts",
  "Infrastructure",
  "Governance",
  "Privacy",
  "Cross-chain",
];

// Validation schema
const formSchema = z.object({
  projectName: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Project name must be less than 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be less than 2000 characters"),
  projectRepo: z
    .string()
    .max(500, "URL must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  demoUrl: z
    .string()
    .max(500, "URL must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  slidesUrl: z
    .string()
    .max(500, "URL must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  liveUrl: z
    .string()
    .max(500, "URL must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  // Final submission fields
  finalSubmissionRepoUrl: z
    .string()
    .max(500, "URL must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  finalSubmissionDemoUrl: z
    .string()
    .max(500, "URL must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  finalSubmissionDocsUrl: z
    .string()
    .max(500, "URL must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  finalSubmissionSummary: z
    .string()
    .max(2000, "Summary must be less than 2000 characters")
    .optional()
    .or(z.literal("")),
  // Hackathon fields
  hackathonId: z
    .string()
    .max(200, "ID must be less than 200 characters")
    .optional()
    .or(z.literal("")),
  hackathonName: z
    .string()
    .max(200, "Name must be less than 200 characters")
    .optional()
    .or(z.literal("")),
  hackathonEndDate: z
    .string()
    .max(100, "Date must be less than 100 characters")
    .optional()
    .or(z.literal("")),
});

type FormData = z.infer<typeof formSchema>;

interface BountyPrizeRow {
  name: string;
  amount: number;
  hackathonWonAtId: string;
}

interface EditProjectDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    projectName: string;
    description: string;
    projectRepo?: string;
    demoUrl?: string;
    slidesUrl?: string;
    liveUrl?: string;
    categories?: string[];
    techStack?: string[];
    finalSubmission?: {
      repoUrl?: string;
      demoUrl?: string;
      docsUrl?: string;
      summary?: string;
      submittedDate?: string;
      submittedBy?: string;
    };
    hackathon?: {
      id?: string;
      name?: string;
      endDate?: string;
      eventStartedAt?: string;
    };
    bountyPrize?: Array<{
      name: string;
      amount: number;
      hackathonWonAtId: string;
    }>;
  };
  onSave: (data: {
    projectName: string;
    description: string;
    projectRepo?: string;
    demoUrl?: string;
    slidesUrl?: string;
    liveUrl?: string;
    categories: string[];
    techStack: string[];
    finalSubmission?: {
      repoUrl?: string;
      demoUrl?: string;
      docsUrl?: string;
      summary?: string;
    };
    hackathon?: {
      id?: string;
      name?: string;
      endDate?: string;
    };
    bountyPrize?: Array<{
      name: string;
      amount: number;
      hackathonWonAtId: string;
    }>;
  }) => Promise<void>;
}

export function EditProjectDetailsModal({
  open,
  onOpenChange,
  project,
  onSave,
}: EditProjectDetailsModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [techStackInput, setTechStackInput] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);

  // Bounty prize editor state
  const [bountyPrizes, setBountyPrizes] = useState<BountyPrizeRow[]>([]);
  const [bountyNameInput, setBountyNameInput] = useState("");
  const [bountyAmountInput, setBountyAmountInput] = useState("");
  const [bountyHackathonIdInput, setBountyHackathonIdInput] = useState("");
  // Track whether the admin interacted with the bounty editor
  const [bountyEditorTouched, setBountyEditorTouched] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: "",
      description: "",
      projectRepo: "",
      demoUrl: "",
      slidesUrl: "",
      liveUrl: "",
      finalSubmissionRepoUrl: "",
      finalSubmissionDemoUrl: "",
      finalSubmissionDocsUrl: "",
      finalSubmissionSummary: "",
      hackathonId: "",
      hackathonName: "",
      hackathonEndDate: "",
    },
  });

  // Reset form when dialog opens with project data
  useEffect(() => {
    if (open && project) {
      form.reset({
        projectName: project.projectName || "",
        description: project.description || "",
        projectRepo: project.projectRepo || "",
        demoUrl: project.demoUrl || "",
        slidesUrl: project.slidesUrl || "",
        liveUrl: project.liveUrl || "",
        finalSubmissionRepoUrl: project.finalSubmission?.repoUrl || "",
        finalSubmissionDemoUrl: project.finalSubmission?.demoUrl || "",
        finalSubmissionDocsUrl: project.finalSubmission?.docsUrl || "",
        finalSubmissionSummary: project.finalSubmission?.summary || "",
        hackathonId: project.hackathon?.id || "",
        hackathonName: project.hackathon?.name || "",
        hackathonEndDate: project.hackathon?.endDate || "",
      });
      setSelectedCategories(project.categories || []);
      setTechStack(project.techStack || []);
      setBountyPrizes(
        (project.bountyPrize || []).map((b) => ({
          name: b.name,
          amount: b.amount,
          hackathonWonAtId: b.hackathonWonAtId,
        }))
      );
      setBountyEditorTouched(false);
      setBountyNameInput("");
      setBountyAmountInput("");
      setBountyHackathonIdInput("");
    }
  }, [open, project, form]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const addTechStackItem = () => {
    const trimmed = techStackInput.trim();
    if (trimmed && !techStack.includes(trimmed)) {
      setTechStack([...techStack, trimmed]);
      setTechStackInput("");
    }
  };

  const removeTechStackItem = (item: string) => {
    setTechStack(techStack.filter((t) => t !== item));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTechStackItem();
    }
  };

  const addBountyPrize = () => {
    const name = bountyNameInput.trim();
    const amount = parseFloat(bountyAmountInput);
    const hackathonWonAtId = bountyHackathonIdInput.trim();
    if (!name || isNaN(amount) || !hackathonWonAtId) return;
    setBountyPrizes([...bountyPrizes, { name, amount, hackathonWonAtId }]);
    setBountyNameInput("");
    setBountyAmountInput("");
    setBountyHackathonIdInput("");
    setBountyEditorTouched(true);
  };

  const removeBountyPrize = (index: number) => {
    setBountyPrizes(bountyPrizes.filter((_, i) => i !== index));
    setBountyEditorTouched(true);
  };

  const onSubmit = async (data: FormData) => {
    // Assemble finalSubmission — omit if all blank
    const fsRepoUrl = data.finalSubmissionRepoUrl || undefined;
    const fsDemoUrl = data.finalSubmissionDemoUrl || undefined;
    const fsDocsUrl = data.finalSubmissionDocsUrl || undefined;
    const fsSummary = data.finalSubmissionSummary || undefined;
    const finalSubmission =
      fsRepoUrl || fsDemoUrl || fsDocsUrl || fsSummary
        ? { repoUrl: fsRepoUrl, demoUrl: fsDemoUrl, docsUrl: fsDocsUrl, summary: fsSummary }
        : undefined;

    // Assemble hackathon — omit if all blank
    const hId = data.hackathonId || undefined;
    const hName = data.hackathonName || undefined;
    const hEndDate = data.hackathonEndDate || undefined;
    const hackathon =
      hId || hName || hEndDate
        ? { id: hId, name: hName, endDate: hEndDate }
        : undefined;

    // Include bountyPrize only if the project already had bounties or the admin touched the editor
    const hadBounties = (project.bountyPrize || []).length > 0;
    const bountyPrize =
      hadBounties || bountyEditorTouched ? bountyPrizes : undefined;

    try {
      await onSave({
        projectName: data.projectName,
        description: data.description,
        projectRepo: data.projectRepo || undefined,
        demoUrl: data.demoUrl || undefined,
        slidesUrl: data.slidesUrl || undefined,
        liveUrl: data.liveUrl || undefined,
        categories: selectedCategories,
        techStack: techStack,
        finalSubmission,
        hackathon,
        bountyPrize,
      });
      onOpenChange(false);
    } catch {
      // onSave failures are surfaced by the caller (it shows its own toast);
      // keep the modal open so the admin can retry.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">EDIT PROJECT DETAILS</DialogTitle>
          <DialogDescription className="text-body">
            Update your project information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="projectName">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="projectName"
              {...form.register("projectName")}
              placeholder="My Awesome Project"
            />
            {form.formState.errors.projectName && (
              <p className="text-xs text-destructive">
                {form.formState.errors.projectName.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <span
                className={`text-xs ${
                  (form.watch("description")?.length || 0) > 2000
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {form.watch("description")?.length || 0}/2000
              </span>
            </div>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Describe your project..."
              rows={5}
              className="resize-none"
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* GitHub Repository */}
          <div className="space-y-2">
            <Label htmlFor="projectRepo">GitHub Repository</Label>
            <Input
              id="projectRepo"
              {...form.register("projectRepo")}
              placeholder="https://github.com/username/project"
              className="font-mono text-sm"
            />
            {form.formState.errors.projectRepo && (
              <p className="text-xs text-destructive">
                {form.formState.errors.projectRepo.message}
              </p>
            )}
          </div>

          {/* Demo URL */}
          <div className="space-y-2">
            <Label htmlFor="demoUrl">Demo URL</Label>
            <Input
              id="demoUrl"
              {...form.register("demoUrl")}
              placeholder="https://youtube.com/watch?v=... or https://myproject.com"
              className="font-mono text-sm"
            />
            {form.formState.errors.demoUrl && (
              <p className="text-xs text-destructive">
                {form.formState.errors.demoUrl.message}
              </p>
            )}
          </div>

          {/* Slides URL */}
          <div className="space-y-2">
            <Label htmlFor="slidesUrl">Slides URL</Label>
            <Input
              id="slidesUrl"
              {...form.register("slidesUrl")}
              placeholder="https://docs.google.com/presentation/..."
              className="font-mono text-sm"
            />
            {form.formState.errors.slidesUrl && (
              <p className="text-xs text-destructive">
                {form.formState.errors.slidesUrl.message}
              </p>
            )}
          </div>

          {/* Live / website URL */}
          <div className="space-y-2">
            <Label htmlFor="liveUrl">Live site URL</Label>
            <Input
              id="liveUrl"
              {...form.register("liveUrl")}
              placeholder="https://your-project.com"
              className="font-mono text-sm"
            />
            {form.formState.errors.liveUrl && (
              <p className="text-xs text-destructive">
                {form.formState.errors.liveUrl.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Production or live website (e.g. https://kleo.finance/)
            </p>
          </div>

          {/* Categories */}
          <div className="space-y-2">
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_CATEGORIES.map((category) => (
                <Badge
                  key={category}
                  variant={
                    selectedCategories.includes(category)
                      ? "default"
                      : "outline"
                  }
                  className={`cursor-pointer transition-colors ${
                    selectedCategories.includes(category)
                      ? "bg-primary hover:bg-primary/80"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Click to select/deselect categories
            </p>
          </div>

          {/* Tech Stack */}
          <div className="space-y-2">
            <Label>Tech Stack</Label>
            <div className="flex gap-2">
              <Input
                value={techStackInput}
                onChange={(e) => setTechStackInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., React, Rust, ink!"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addTechStackItem}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {techStack.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {techStack.map((tech) => (
                  <Badge
                    key={tech}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {tech}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeTechStackItem(tech)}
                    />
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Press Enter or click + to add technologies
            </p>
          </div>

          {/* Final Submission */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Final Submission</Label>
            <div className="space-y-2">
              <Label htmlFor="finalSubmissionRepoUrl">Repo URL</Label>
              <Input
                id="finalSubmissionRepoUrl"
                {...form.register("finalSubmissionRepoUrl")}
                placeholder="https://github.com/username/project"
                className="font-mono text-sm"
              />
              {form.formState.errors.finalSubmissionRepoUrl && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.finalSubmissionRepoUrl.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalSubmissionDemoUrl">Demo URL</Label>
              <Input
                id="finalSubmissionDemoUrl"
                {...form.register("finalSubmissionDemoUrl")}
                placeholder="https://youtube.com/watch?v=..."
                className="font-mono text-sm"
              />
              {form.formState.errors.finalSubmissionDemoUrl && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.finalSubmissionDemoUrl.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalSubmissionDocsUrl">Docs URL</Label>
              <Input
                id="finalSubmissionDocsUrl"
                {...form.register("finalSubmissionDocsUrl")}
                placeholder="https://docs.myproject.com"
                className="font-mono text-sm"
              />
              {form.formState.errors.finalSubmissionDocsUrl && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.finalSubmissionDocsUrl.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="finalSubmissionSummary">Summary</Label>
                <span
                  className={`text-xs ${
                    (form.watch("finalSubmissionSummary")?.length || 0) > 2000
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                >
                  {form.watch("finalSubmissionSummary")?.length || 0}/2000
                </span>
              </div>
              <Textarea
                id="finalSubmissionSummary"
                {...form.register("finalSubmissionSummary")}
                placeholder="Describe the final project outcome..."
                rows={3}
                className="resize-none"
              />
              {form.formState.errors.finalSubmissionSummary && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.finalSubmissionSummary.message}
                </p>
              )}
            </div>
          </div>

          {/* Hackathon */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Hackathon</Label>
            <div className="space-y-2">
              <Label htmlFor="hackathonId">Hackathon ID</Label>
              <Input
                id="hackathonId"
                {...form.register("hackathonId")}
                placeholder="e.g., funkhaus-2024"
                className="font-mono text-sm"
              />
              {form.formState.errors.hackathonId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.hackathonId.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="hackathonName">Hackathon Name</Label>
              <Input
                id="hackathonName"
                {...form.register("hackathonName")}
                placeholder="e.g., Symmetry 2024"
              />
              {form.formState.errors.hackathonName && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.hackathonName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="hackathonEndDate">Hackathon End Date</Label>
              <Input
                id="hackathonEndDate"
                {...form.register("hackathonEndDate")}
                placeholder="e.g., 2024-11-30"
                className="font-mono text-sm"
              />
              {form.formState.errors.hackathonEndDate && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.hackathonEndDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Bounty Prizes */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Bounty Prizes</Label>
            <div className="flex gap-2 flex-wrap">
              <Input
                value={bountyNameInput}
                onChange={(e) => setBountyNameInput(e.target.value)}
                placeholder="Prize name"
                className="flex-1 min-w-[140px]"
              />
              <Input
                type="number"
                value={bountyAmountInput}
                onChange={(e) => setBountyAmountInput(e.target.value)}
                placeholder="Amount"
                className="w-28"
              />
              <Input
                value={bountyHackathonIdInput}
                onChange={(e) => setBountyHackathonIdInput(e.target.value)}
                placeholder="Hackathon ID"
                className="flex-1 min-w-[140px] font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addBountyPrize}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {bountyPrizes.length > 0 && (
              <div className="space-y-2 mt-2">
                {bountyPrizes.map((prize, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 p-2 bg-muted/40 rounded-md"
                  >
                    <div className="text-sm flex-1 min-w-0">
                      <span className="font-medium">{prize.name}</span>
                      <span className="text-muted-foreground mx-2">·</span>
                      <span>{prize.amount}</span>
                      <span className="text-muted-foreground mx-2">·</span>
                      <span className="font-mono text-xs text-muted-foreground truncate">
                        {prize.hackathonWonAtId}
                      </span>
                    </div>
                    <X
                      className="h-4 w-4 cursor-pointer shrink-0 hover:text-destructive"
                      onClick={() => removeBountyPrize(index)}
                    />
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Fill all three fields and click + to add a prize row
            </p>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
              className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> SAVING…
                </>
              ) : (
                "SAVE CHANGES"
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
