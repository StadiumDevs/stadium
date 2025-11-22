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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Github, Video, FileText, AlertTriangle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";

const formSchema = z.object({
  repoUrl: z
    .string()
    .min(1, "Repository URL is required")
    .refine(url => url.startsWith('www') || url.startsWith('http://') || url.startsWith('https://'), {
      message: 'Must be a valid URL (starting with www or http)',
    }),
  demoUrl: z
    .string()
    .min(1, "Demo video URL is required")
    .refine(url => url.startsWith('www') || url.startsWith('http://') || url.startsWith('https://'), {
      message: 'Must be a valid URL (starting with www or http)',
    }),
  docsUrl: z
    .string()
    .min(1, "Documentation URL is required")
    .refine(url => url.startsWith('www') || url.startsWith('http://') || url.startsWith('https://'), {
      message: 'Must be a valid URL (starting with www or http)',
    }),
  summary: z
    .string()
    .min(10, "Summary must be at least 10 characters")
    .max(1000, "Summary must be less than 1000 characters"),
  confirmed: z.boolean().refine(val => val === true, {
    message: 'You must confirm your submission is ready',
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface SubmitM2DeliverablesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: any;
  onSubmit: (data: Omit<FormValues, 'confirmed'>) => Promise<void>;
}

export function SubmitM2DeliverablesModal({
  open,
  onOpenChange,
  project,
  onSubmit,
}: SubmitM2DeliverablesModalProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      repoUrl: project?.projectRepo || '',
      demoUrl: project?.demoUrl || '',
      docsUrl: '',
      summary: '',
      confirmed: false,
    },
    mode: "onBlur",
  });

  useEffect(() => {
    if (open) {
      form.reset({
        repoUrl: project?.projectRepo || '',
        demoUrl: project?.demoUrl || '',
        docsUrl: '',
        summary: '',
        confirmed: false,
      });
    }
  }, [open, project, form]);

  const handleSubmit = async (data: FormValues) => {
    try {
      const { confirmed, ...submissionData } = data;
      await onSubmit(submissionData);
      onOpenChange(false);
    } catch (error) {
      console.error('Submission failed:', error);
      // Error handling is done in parent component
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit M2 Deliverables</DialogTitle>
          <DialogDescription>
            Submit your completed work for WebZero review. All fields are required.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-primary/5 border-primary/20">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm text-foreground">
            <strong>Before submitting:</strong> Make sure your code is complete, tested, and
            documented according to your M2 Agreement roadmap.
          </AlertDescription>
        </Alert>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
          {/* GitHub Repository */}
          <div className="space-y-2">
            <Label htmlFor="repoUrl" className="flex items-center gap-2">
              <Github className="h-4 w-4" />
              GitHub Repository <span className="text-destructive">*</span>
            </Label>
            <Input
              id="repoUrl"
              {...form.register('repoUrl')}
              placeholder="https://github.com/username/project"
              className="font-mono text-sm bg-muted/30 border-border"
            />
            <p className="text-xs text-muted-foreground">
              ⓘ Link to your code repository (GitHub, GitLab, etc.)
            </p>
            {form.formState.errors.repoUrl && (
              <p className="text-xs text-destructive">
                {form.formState.errors.repoUrl.message}
              </p>
            )}
          </div>

          {/* Demo Video */}
          <div className="space-y-2">
            <Label htmlFor="demoUrl" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Demo Video <span className="text-destructive">*</span>
            </Label>
            <Input
              id="demoUrl"
              {...form.register('demoUrl')}
              placeholder="https://youtube.com/watch?v=... or https://loom.com/share/..."
              className="font-mono text-sm bg-muted/30 border-border"
            />
            <p className="text-xs text-muted-foreground">
              ⓘ Video link demonstrating your project (YouTube, Loom, or other platform)
            </p>
            {form.formState.errors.demoUrl && (
              <p className="text-xs text-destructive">
                {form.formState.errors.demoUrl.message}
              </p>
            )}
          </div>

          {/* Documentation URL */}
          <div className="space-y-2">
            <Label htmlFor="docsUrl" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentation URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="docsUrl"
              {...form.register('docsUrl')}
              placeholder="https://docs.yourproject.com or https://github.com/user/repo#readme"
              className="font-mono text-sm bg-muted/30 border-border"
            />
            <p className="text-xs text-muted-foreground">
              ⓘ Link to your documentation (README, wiki, or hosted docs)
            </p>
            {form.formState.errors.docsUrl && (
              <p className="text-xs text-destructive">
                {form.formState.errors.docsUrl.message}
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">
              Project Summary <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="summary"
              {...form.register('summary')}
              rows={5}
              placeholder="Describe what you built, key features implemented, technologies used, and any challenges overcome..."
              className="resize-none bg-muted/30 border-border"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                ⓘ Brief overview of your M2 accomplishments
              </span>
              <span className={`font-mono ${
                (form.watch('summary')?.length || 0) > 1000 ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {form.watch('summary')?.length || 0}/1000
              </span>
            </div>
            {form.formState.errors.summary && (
              <p className="text-xs text-destructive">
                {form.formState.errors.summary.message}
              </p>
            )}
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg bg-muted/50">
            <Checkbox
              id="confirmed"
              checked={form.watch('confirmed')}
              onCheckedChange={(checked) => form.setValue('confirmed', checked as boolean)}
              className="mt-1"
            />
            <Label
              htmlFor="confirmed"
              className="text-sm font-normal leading-relaxed cursor-pointer text-foreground"
            >
              I confirm that my M2 deliverables are complete and ready for review. I understand
              that WebZero will evaluate my work against the M2 Agreement roadmap.
            </Label>
          </div>
          {form.formState.errors.confirmed && (
            <p className="text-xs text-destructive -mt-2 ml-1">
              {form.formState.errors.confirmed.message}
            </p>
          )}

          <Alert className="bg-green-500/5 border-green-500/20">
            <AlertDescription className="text-xs text-foreground">
              💡 <strong>After submission:</strong> WebZero will review within 2-3 days. You'll
              be notified via email and can track status on this page.
            </AlertDescription>
          </Alert>

          <DialogFooter className="bg-card/50 pt-4 -mx-6 -mb-6 px-6 rounded-b-lg">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!form.watch('confirmed') || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit for Review'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

