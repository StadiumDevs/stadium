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
import { ExternalLink, Github, Trophy } from "lucide-react"

interface ProjectDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: {
    title: string
    author: string
    description: string
    longDescription?: string
    track: string
    isWinner?: boolean
    demoUrl?: string
    githubUrl?: string
    projectUrl?: string
    eventStartedAt?: string
  }
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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

        <Separator className="my-4" />

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
                ? "Synergy 2024" 
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

          <Separator />

          <div className="flex gap-3">
            {project.demoUrl && (
              <Button
                className="flex-1"
                onClick={() => window.open(project.demoUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
                View Demo
              </Button>
            )}
            {project.projectUrl && (
              <Button
                variant="secondary"
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
