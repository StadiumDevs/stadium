import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Github, Video, FileText, AlertTriangle, Loader2, Lightbulb } from "lucide-react";
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
      const { confirmed: _confirmed, ...submissionData } = data;
      void _confirmed;
      await onSubmit(submissionData);
      onOpenChange(false);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Submission failed:', error);
      }
      // Error handling is done in parent component
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">SUBMIT M2 DELIVERABLES</DialogTitle>
          <DialogDescription className="text-body">
            Submit your completed work for WebZero review. All fields are required.
          </DialogDescription>
        </DialogHeader>

        <div className="lcd p-3 flex items-start gap-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-display flex-shrink-0 mt-0.5" />
          <p className="text-sm text-body">
            <span className="label-hw text-display">·BEFORE SUBMITTING — </span>
            make sure your code is complete, tested, and documented according to your M2 Agreement
            roadmap.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
          {/* GitHub Repository */}
          <div className="space-y-1.5">
            <Label htmlFor="repoUrl" className="label-hw-dim flex items-center gap-1.5">
              <Github className="h-3 w-3" />
              ·GITHUB REPOSITORY *
            </Label>
            <Input
              id="repoUrl"
              {...form.register('repoUrl')}
              placeholder="https://github.com/username/project"
              className="font-mono text-sm"
            />
            <p className="label-hw-dim">LINK TO YOUR CODE REPOSITORY (GITHUB, GITLAB, ETC.)</p>
            {form.formState.errors.repoUrl && (
              <p className="label-hw text-destructive">
                ·{form.formState.errors.repoUrl.message?.toUpperCase()}
              </p>
            )}
          </div>

          {/* Demo Video */}
          <div className="space-y-1.5">
            <Label htmlFor="demoUrl" className="label-hw-dim flex items-center gap-1.5">
              <Video className="h-3 w-3" />
              ·DEMO VIDEO *
            </Label>
            <Input
              id="demoUrl"
              {...form.register('demoUrl')}
              placeholder="https://youtube.com/watch?v=… or https://loom.com/share/…"
              className="font-mono text-sm"
            />
            <p className="label-hw-dim">
              VIDEO LINK DEMONSTRATING YOUR PROJECT (YOUTUBE, LOOM, OR OTHER PLATFORM)
            </p>
            {form.formState.errors.demoUrl && (
              <p className="label-hw text-destructive">
                ·{form.formState.errors.demoUrl.message?.toUpperCase()}
              </p>
            )}
          </div>

          {/* Documentation URL */}
          <div className="space-y-1.5">
            <Label htmlFor="docsUrl" className="label-hw-dim flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              ·DOCUMENTATION URL *
            </Label>
            <Input
              id="docsUrl"
              {...form.register('docsUrl')}
              placeholder="https://docs.yourproject.com or https://github.com/user/repo#readme"
              className="font-mono text-sm"
            />
            <p className="label-hw-dim">LINK TO YOUR DOCUMENTATION (README, WIKI, OR HOSTED DOCS)</p>
            {form.formState.errors.docsUrl && (
              <p className="label-hw text-destructive">
                ·{form.formState.errors.docsUrl.message?.toUpperCase()}
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-1.5">
            <Label htmlFor="summary" className="label-hw-dim">·PROJECT SUMMARY *</Label>
            <Textarea
              id="summary"
              {...form.register('summary')}
              rows={5}
              placeholder="Describe what you built, key features implemented, technologies used, and any challenges overcome…"
              className="resize-none font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="label-hw-dim">BRIEF OVERVIEW OF YOUR M2 ACCOMPLISHMENTS</span>
              <span className={
                (form.watch('summary')?.length || 0) > 1000 ? 'label-hw text-destructive' : 'label-hw-dim'
              }>
                {form.watch('summary')?.length || 0} / 1000
              </span>
            </div>
            {form.formState.errors.summary && (
              <p className="label-hw text-destructive">
                ·{form.formState.errors.summary.message?.toUpperCase()}
              </p>
            )}
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-3 lcd p-4">
            <Checkbox
              id="confirmed"
              checked={form.watch('confirmed')}
              onCheckedChange={(checked) => form.setValue('confirmed', checked as boolean)}
              className="mt-1"
            />
            <Label
              htmlFor="confirmed"
              className="text-sm font-normal leading-relaxed cursor-pointer text-body"
            >
              I confirm that my M2 deliverables are complete and ready for review. I understand
              that WebZero will evaluate my work against the M2 Agreement roadmap.
            </Label>
          </div>
          {form.formState.errors.confirmed && (
            <p className="label-hw text-destructive -mt-2 ml-1">
              ·{form.formState.errors.confirmed.message?.toUpperCase()}
            </p>
          )}

          <div className="lcd p-3 flex items-start gap-2.5">
            <Lightbulb className="h-3.5 w-3.5 text-led flex-shrink-0 mt-0.5" />
            <p className="text-sm text-body">
              <span className="label-hw text-led">·AFTER SUBMISSION — </span>
              WebZero will review within 2-3 days. You'll be notified via email and can track status on this page.
            </p>
          </div>

          <DialogFooter className="pt-4 border-t border-hairline-subtle">
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
              disabled={!form.watch('confirmed') || form.formState.isSubmitting}
              className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> SUBMITTING…
                </>
              ) : (
                'SUBMIT FOR REVIEW ▸'
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

