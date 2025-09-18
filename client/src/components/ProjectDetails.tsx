import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Github,
  Globe,
  Calendar,
  User,
  Tag,
  Target,
  FileText,
  CheckCircle,
  Trophy,
  Loader2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { projectApi } from "@/lib/mockApi";
import { Project } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadProject = async () => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const projectData = await projectApi.getProject(id);
        if (projectData) {
          setProject(projectData);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        const err = error as Error;
        toast({
          title: "Error",
          description: err?.message || "Failed to load project details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [id, toast]);

  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "winner":
        return "bg-gradient-accent text-accent-foreground";
      case "approved":
        return "bg-success text-success-foreground";
      case "reviewing":
        return "bg-warning text-warning-foreground";
      case "pending":
        return "bg-muted text-muted-foreground";
      case "rejected":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg">Loading project details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="container py-8">
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Project Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The project you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link to="/" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>All Active Projects</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link to="/" className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>All Active Projects</span>
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <Badge
                      className={getStatusColor(project.status)}
                      variant="secondary"
                    >
                      {project.status}
                    </Badge>
                    {project.status === "winner" && (
                      <div className="flex items-center space-x-1 text-yellow-500">
                        <Trophy className="h-5 w-5" />
                        <span className="text-sm font-medium">Winner</span>
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-3xl">
                    {project.projectTitle}
                  </CardTitle>
                  <CardDescription className="text-lg">
                    {project.projectSummary}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Project Background */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Background</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {project.background}
              </p>
            </CardContent>
          </Card>

          {/* Tech Stack */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="h-5 w-5" />
                <span>Technology Stack</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {project.techStack.split(",").map((tech, index) => (
                  <Badge key={index} variant="outline">
                    {tech.trim()}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Milestone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Current Milestone</span>
              </CardTitle>
              <CardDescription>{project.milestoneTitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {project.milestoneDescription}
              </p>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">Deliverables</h4>
                <ul className="space-y-2">
                  {project.deliverables.map((deliverable, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        {deliverable}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Success Criteria */}
          <Card>
            <CardHeader>
              <CardTitle>Success Criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{project.successCriteria}</p>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          {project.additionalNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {project.additionalNotes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Team Address</div>
                  <div className="text-xs font-mono text-muted-foreground">
                    {project.ss58Address}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Submitted</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(project.submittedAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Other Milestones</div>
                  <div className="text-sm text-muted-foreground">
                    {project.hasOtherMilestones ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* External Links */}
          {(project.gitLink || project.demoLink) && (
            <Card>
              <CardHeader>
                <CardTitle>External Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.gitLink && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <a
                      href={project.gitLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2"
                    >
                      <Github className="h-4 w-4" />
                      <span>View Source Code</span>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  </Button>
                )}

                {project.demoLink && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <a
                      href={project.demoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2"
                    >
                      <Globe className="h-4 w-4" />
                      <span>View Live Demo</span>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <Button className="w-full" asChild>
                <Link to="/submission">Submit Your Project</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;