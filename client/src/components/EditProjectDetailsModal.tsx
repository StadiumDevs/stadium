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
});

type FormData = z.infer<typeof formSchema>;

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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: "",
      description: "",
      projectRepo: "",
      demoUrl: "",
      slidesUrl: "",
      liveUrl: "",
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
      });
      setSelectedCategories(project.categories || []);
      setTechStack(project.techStack || []);
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

  const onSubmit = async (data: FormData) => {
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
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save project details:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project Details</DialogTitle>
          <DialogDescription>
            Update your project information
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
