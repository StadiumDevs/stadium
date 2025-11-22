import { useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Validation schema
const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  walletAddress: z.string()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{47,48}$/, "Invalid SS58 address (must be 47-48 characters)")
    .optional()
    .or(z.literal('')),
  role: z.string().max(50, "Role must be less than 50 characters").optional().or(z.literal('')),
  twitter: z.string().max(200, "URL must be less than 200 characters").optional().or(z.literal('')),
  github: z.string().max(200, "URL must be less than 200 characters").optional().or(z.literal('')),
  linkedin: z.string().max(200, "URL must be less than 200 characters").optional().or(z.literal('')),
  customUrl: z.string().max(200, "URL must be less than 200 characters").optional().or(z.literal('')),
});

const formSchema = z.object({
  teamMembers: z.array(teamMemberSchema).min(1, "At least one team member required"),
});

type FormData = z.infer<typeof formSchema>;

export interface TeamMember {
  name: string;
  walletAddress?: string;
  role?: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
  customUrl?: string;
}

interface EditTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: TeamMember[];
  onSave: (teamMembers: TeamMember[]) => Promise<void>;
}

export function EditTeamModal({ 
  open, 
  onOpenChange, 
  teamMembers,
  onSave 
}: EditTeamModalProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamMembers: teamMembers.length > 0 ? teamMembers : [{ name: '', walletAddress: '', role: '' }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "teamMembers",
  });

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      form.reset({
        teamMembers: teamMembers.length > 0 ? teamMembers : [{ name: '', walletAddress: '', role: '' }],
      });
    }
  }, [open, teamMembers, form]);
  
  const onSubmit = async (data: FormData) => {
    try {
      await onSave(data.teamMembers);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done by parent component
      console.error('Failed to save team:', error);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Team Members</DialogTitle>
          <DialogDescription>
            Update your team composition and member details
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="relative">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Team Member {index + 1}</h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`teamMembers.${index}.name`}>
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      {...form.register(`teamMembers.${index}.name`)}
                      placeholder="Sarah Chen"
                    />
                    {form.formState.errors.teamMembers?.[index]?.name && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.teamMembers[index]?.name?.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`teamMembers.${index}.walletAddress`}>
                      Wallet Address
                    </Label>
                    <Input
                      {...form.register(`teamMembers.${index}.walletAddress`)}
                      placeholder="5DAAnuX2qToh..."
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      ⓘ SS58 format required (47-48 characters)
                    </p>
                    {form.formState.errors.teamMembers?.[index]?.walletAddress && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.teamMembers[index]?.walletAddress?.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`teamMembers.${index}.role`}>Role</Label>
                    <Input
                      {...form.register(`teamMembers.${index}.role`)}
                      placeholder="Lead Developer"
                    />
                    {form.formState.errors.teamMembers?.[index]?.role && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.teamMembers[index]?.role?.message}
                      </p>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`teamMembers.${index}.twitter`}>Twitter</Label>
                      <Input
                        {...form.register(`teamMembers.${index}.twitter`)}
                        placeholder="@username or URL"
                      />
                      {form.formState.errors.teamMembers?.[index]?.twitter && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.teamMembers[index]?.twitter?.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`teamMembers.${index}.github`}>GitHub</Label>
                      <Input
                        {...form.register(`teamMembers.${index}.github`)}
                        placeholder="github.com/username"
                      />
                      {form.formState.errors.teamMembers?.[index]?.github && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.teamMembers[index]?.github?.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`teamMembers.${index}.linkedin`}>LinkedIn</Label>
                      <Input
                        {...form.register(`teamMembers.${index}.linkedin`)}
                        placeholder="linkedin.com/in/username"
                      />
                      {form.formState.errors.teamMembers?.[index]?.linkedin && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.teamMembers[index]?.linkedin?.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`teamMembers.${index}.customUrl`}>Custom URL</Label>
                      <Input
                        {...form.register(`teamMembers.${index}.customUrl`)}
                        placeholder="portfolio.com"
                      />
                      {form.formState.errors.teamMembers?.[index]?.customUrl && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.teamMembers[index]?.customUrl?.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => append({ name: '', walletAddress: '', role: '' })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Another Member
          </Button>
          
          {form.formState.errors.teamMembers && (
            <p className="text-xs text-destructive">
              {form.formState.errors.teamMembers.message}
            </p>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

