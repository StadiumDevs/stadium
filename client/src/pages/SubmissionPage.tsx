import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Trash2, Send, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { projectApi } from "@/lib/mockApi";
import { useToast } from "@/hooks/use-toast";
import TechStackChips from "@/components/TechStackChips";

// Form validation schema using proper Zod v3 syntax
const projectSchema = z.object({
  ss58Address: z
    .string()
    .min(1, "Address is required")
    .regex(/^5[A-Za-z0-9]{47}$/, "Invalid SS58 address format"),
  teamName: z
    .string()
    .min(1, "Team name is required")
    .max(100, "Team name too long"),
  projectTitle: z
    .string()
    .min(1, "Project title is required")
    .max(100, "Title too long"),
  projectSummary: z
    .string()
    .min(1, "Project summary is required")
    .max(300, "Summary too long"),
  background: z.string().min(1, "Background is required"),
  techStack: z.array(z.string()).min(1, "At least one technology is required"),
  gitLink: z.union([z.string().url("Invalid URL"), z.literal("")]).optional(),
  demoLink: z.union([z.string().url("Invalid URL"), z.literal("")]).optional(),
  milestoneTitle: z.string().min(1, "Milestone title is required"),
  milestoneDescription: z.string().min(1, "Milestone description is required"),
  deliverables: z
    .array(
      z.object({
        value: z.string().min(1, "Deliverable cannot be empty"),
      })
    )
    .min(1, "At least one deliverable is required"),
  successCriteria: z.string().min(1, "Success criteria is required"),
  additionalNotes: z.string().optional(),
  hasOtherMilestones: z.boolean(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

const SubmissionPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      ss58Address: "",
      teamName: "",
      projectTitle: "",
      projectSummary: "",
      background: "",
      techStack: [],
      gitLink: "",
      demoLink: "",
      milestoneTitle: "",
      milestoneDescription: "",
      deliverables: [{ value: "" }],
      successCriteria: "",
      additionalNotes: "",
      hasOtherMilestones: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "deliverables",
  });

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      const projectData = {
        ss58Address: data.ss58Address,
        teamName: data.teamName,
        projectTitle: data.projectTitle,
        projectSummary: data.projectSummary,
        background: data.background,
        techStack: data.techStack.join(", "), // Convert array back to string for API
        milestoneTitle: data.milestoneTitle,
        milestoneDescription: data.milestoneDescription,
        successCriteria: data.successCriteria,
        hasOtherMilestones: data.hasOtherMilestones,
        deliverables: data.deliverables.map((d) => d.value),
        gitLink: data.gitLink || undefined,
        demoLink: data.demoLink || undefined,
        additionalNotes: data.additionalNotes || undefined,
      };

      const { status, project } = await projectApi.submitProject(projectData);

      if (status == "success") {
        toast({
          title: "Success!",
          description: "Your project has been submitted successfully.",
        });
      } else {
        toast({
          title: "Error!",
          description: "Could not submit your milestone successfully.",
        });
      }

      // Navigate to the new project's detail page
      navigate(`/project/${project.ss58Address}`);
    } catch (error) {
      toast({
        title: "Submission Failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while submitting your project.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container py-8 pt-24 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="font-heading text-4xl font-bold mb-4">Project submission</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Project Submission Form</CardTitle>
          <CardDescription>
            Please fill out all required fields to submit your project with the milestones you plan on completing for review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 submission-form" data-form="project-submission">
              {/* Team Information */}
              <div className="space-y-4 team-information">
                <h3 className="font-heading text-lg font-semibold">Team Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="teamName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Team Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ss58Address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rewards Address *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="14aUgiMVhccuJMbdyfvfbUnTkFX7hWzJo8CrvyUUd2JBMEVm"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This is the address your team will receive your rewards to.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Project Details */}
              <div className="space-y-4">
                <h3 className="font-heading text-lg font-semibold">Project Details</h3>

                <FormField
                  control={form.control}
                  name="projectTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your Project Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="projectSummary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Summary *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A brief overview of your project (max 300 characters)"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.length || 0}/300 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="background"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Background & Problem Statement *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the problem your project solves and the motivation behind it"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="techStack"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tech Stack *</FormLabel>
                      <FormControl>
                        <TechStackChips
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Enter technologies used (e.g., React, Substrate, Rust)"
                        />
                      </FormControl>

                      <FormDescription>
                        {/* Add the technologies and frameworks used in your project */}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
                  <FormField
                    control={form.control}
                    name="gitLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GitHub Repository</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://github.com/username/project"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="demoLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Live Demo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://your-demo.vercel.app"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Milestone Information */}
              <div className="space-y-4">
                <h3 className="font-heading text-lg font-semibold">Milestone Information</h3>

                <FormField
                  control={form.control}
                  name="milestoneTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Milestone Title *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Current milestone name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="milestoneDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Milestone Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detailed description of what this milestone aims to achieve"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Deliverables */}
                <div className="space-y-3">
                  <Label>Deliverables *</Label>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <FormField
                        control={form.control}
                        name={`deliverables.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder={`Deliverable ${index + 1}`}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ value: "" })}
                    className="flex items-center space-x-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Add Deliverable</span>
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name="successCriteria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Success Criteria *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Define what success looks like for this milestone"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasOtherMilestones"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          This project has additional milestones planned
                        </FormLabel>
                        <FormDescription>
                          Check this if you plan to submit more milestones for
                          this project
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="font-heading text-lg font-semibold">
                  Additional Information
                </h3>

                <FormField
                  control={form.control}
                  name="additionalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional information you'd like to share"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full md:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Project
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default SubmissionPage;
