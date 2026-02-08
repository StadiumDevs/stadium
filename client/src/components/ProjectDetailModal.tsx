import { useNavigate } from "react-router-dom"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ExternalLink, Github, Globe, Trophy } from "lucide-react"
import { DemoPlayer } from "@/components/DemoPlayer"

export interface ProjectDetailModalProject {
  title: string
  author: string
  description: string
  longDescription?: string
  track: string
  isWinner?: boolean
  demoUrl?: string
  githubUrl?: string
  projectUrl?: string
  liveUrl?: string
  eventStartedAt?: string
}

interface ProjectDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectDetailModalProject
}

export function ProjectDetailModal({
  open,
  onOpenChange,
  project,
}: ProjectDetailModalProps) {
  const navigate = useNavigate()


  const handleProjectPageClick = () => {
    if (project.projectUrl) {
      onOpenChange(false) // Close the modal first
      navigate(project.projectUrl) // Then navigate
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="font-heading text-2xl font-bold mb-2">
                {project.title}
              </DialogTitle>
              <DialogDescription className="text-base text-accent">
                By {project.author}
              </DialogDescription>
            </div>
            {project.isWinner && (
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0" role="img" aria-label="Winner badge">
                <Trophy className="w-6 h-6 text-black" aria-hidden="true" />
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Live site: primary when present */}
        {project.liveUrl && project.liveUrl !== "nan" && (
          <div className="my-4">
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <Globe className="h-5 w-5" aria-hidden="true" />
              Visit live site
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        )}

        {/* Demo Player Section (when no live URL or in addition) */}
        {project.demoUrl && project.demoUrl !== "nan" && (
          <div className="my-4">
            <DemoPlayer demoUrl={project.demoUrl} title={project.title} />
          </div>
        )}

        <Separator className="my-4" />

        {/* Project Details */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Created At
            </h4>
            <Badge
              variant="outline"
              className="bg-primary/10 border-primary text-accent"
            >
              {project.eventStartedAt === "funkhaus-2024" 
                ? "Symmetry 2024" 
                : project.eventStartedAt === "synergy-hack-2024" 
                ? "Synergy 2025" 
                : project.eventStartedAt || "Unknown"}
            </Badge>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Description
            </h4>
            <p className="text-foreground leading-relaxed">
              {project.longDescription || project.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4">
            {project.liveUrl && project.liveUrl !== "nan" && (
              <Button
                variant="default"
                className="flex-1 gap-2"
                asChild
              >
                <a href={project.liveUrl} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  Visit live site
                </a>
              </Button>
            )}
            {project.projectUrl && (
              <Button
                variant={project.liveUrl ? "outline" : "default"}
                className="flex-1"
                onClick={handleProjectPageClick}
              >
                Project Page
              </Button>
            )}
            {project.githubUrl && (
              <Button
                variant="outline"
                size="icon"
                aria-label={`View GitHub repository for ${project.title}`}
                onClick={() => window.open(project.githubUrl, "_blank", "noopener,noreferrer")}
              >
                <Github className="w-5 h-5" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
