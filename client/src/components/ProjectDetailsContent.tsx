import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Github, Globe, Calendar, User, Tag, Target, FileText, CheckCircle, Trophy, ExternalLink } from "lucide-react";

interface ProjectDetailsContentProps {
  project: any;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "winner":
      return "bg-gradient-accent text-accent-foreground";
    case "approved":
      return "bg-primary text-primary-foreground";
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

export const ProjectDetailsContent: React.FC<ProjectDetailsContentProps> = ({ project }) => {
  if (!project) return null;
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-1">{project.projectName}</h2>
          <p className="text-muted-foreground mb-2">By {project.teamLead}</p>
        </div>
        {project.status && (
          <Badge className={getStatusColor(project.status)} variant="secondary">
            {project.status}
          </Badge>
        )}
      </div>
      <p className="text-lg mb-4">{project.description}</p>
      {/* Links */}
      <div className="flex gap-2 mb-4">
        {project.githubRepo && project.githubRepo !== "nan" && (
          <Button variant="outline" asChild>
            <a href={project.githubRepo} target="_blank" rel="noopener noreferrer">
              <Github className="mr-2 h-4 w-4" /> View Code
            </a>
          </Button>
        )}
        {project.demoUrl && project.demoUrl !== "nan" && (
          <Button asChild>
            <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
              <Globe className="mr-2 h-4 w-4" /> Visit Site
            </a>
          </Button>
        )}
        {project.slidesUrl && project.slidesUrl !== "nan" && (
          <Button variant="outline" asChild>
            <a href={project.slidesUrl} target="_blank" rel="noopener noreferrer">
              <FileText className="mr-2 h-4 w-4" /> Slides
            </a>
          </Button>
        )}
      </div>
      <Separator />
      {/* Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-xs">{project.teamLead}</span>
        </div>
        <div className="flex items-center gap-4">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{formatDate(project.eventStartedAt)}</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {project.techStack && project.techStack.split(",").map((tech: string, i: number) => (
            <Badge key={i} variant="outline" className="text-xs">
              {tech.trim()}
            </Badge>
          ))}
        </div>
      </div>
      {/* Milestones */}
      {project.milestones && project.milestones.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 mt-6 flex items-center gap-2">
            <Target className="h-5 w-5" /> Milestones
          </h3>
          <ul className="space-y-2">
            {project.milestones.map((milestone: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{milestone}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Additional Notes */}
      {project.additionalNotes && (
        <div>
          <h3 className="font-semibold mb-2 mt-6">Additional Notes</h3>
          <p className="text-muted-foreground">{project.additionalNotes}</p>
        </div>
      )}
    </div>
  );
}; 