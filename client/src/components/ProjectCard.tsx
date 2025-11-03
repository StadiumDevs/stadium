import { memo, useCallback } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ExternalLink, Github, Trophy, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectCardProps {
  title: string
  author: string
  description: string
  track: string
  isWinner?: boolean
  demoUrl?: string
  githubUrl?: string
  projectUrl?: string
  className?: string
  onClick?: () => void
  m2Status?: 'building' | 'under_review' | 'completed'
  m2Week?: number
  showM2Progress?: boolean
  submittedDate?: string
  completionDate?: string
}

function ProjectCardComponent({
  title,
  author,
  description,
  track,
  isWinner = false,
  demoUrl,
  githubUrl,
  projectUrl,
  className,
  onClick,
  m2Status,
  m2Week,
  showM2Progress = false,
  submittedDate,
  completionDate,
}: ProjectCardProps) {
  // Calculate progress percentage
  const progressPercentage = m2Week && m2Week > 0 ? Math.min((m2Week / 6) * 100, 100) : 0

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateString
    }
  }
  return (
    <Card
      role="button"
      tabIndex={onClick ? 0 : undefined}
      aria-label={`View project details for ${title}`}
      className={cn(
        "group relative cursor-pointer transition-all duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isWinner && "border-yellow-500 border-2",
        className
      )}
      onClick={onClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      } : undefined}
    >
      {isWinner && (
        <>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-primary" />
          <div className="absolute top-4 right-4 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse" role="img" aria-label="Winner badge">
            <Trophy className="w-5 h-5 text-black" aria-hidden="true" />
          </div>
        </>
      )}

      <CardHeader className="pb-3">
        {/* M2 Status Badge - shown after winner badge when showM2Progress is true */}
        {showM2Progress && m2Status && (
          <div className="mb-3">
            {m2Status === 'building' && (
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                Week {m2Week || 'X'}/6 · Building
              </Badge>
            )}
            {m2Status === 'under_review' && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                Under Review
              </Badge>
            )}
            {m2Status === 'completed' && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-green-500/30">
                ✅ M2 Complete
              </Badge>
            )}
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-heading text-xl font-bold text-foreground mb-1 line-clamp-1">
              {title}
            </h3>
            <p className="text-sm font-medium text-accent">By {author}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {description}
        </p>

        {/* M2 Progress Section (Building) */}
        {m2Status === 'building' && m2Week !== undefined && (
          <div className="space-y-2 pt-2 border-t border-subtle">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                📊 M2 Progress: Week {m2Week} of 6
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* Review Status (Under Review) */}
        {m2Status === 'under_review' && (
          <div className="space-y-2 pt-2 border-t border-subtle">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">⏳ Under Review</span>
            </div>
            {submittedDate && (
              <p className="text-xs text-muted-foreground">
                Submitted: {formatDate(submittedDate)}
              </p>
            )}
          </div>
        )}

        {/* Completion Info (Completed) */}
        {m2Status === 'completed' && (
          <div className="space-y-2 pt-2 border-t border-subtle">
            <Badge className="bg-yellow-500 text-black mb-2">
              ✅ M2 Graduate
            </Badge>
            {completionDate && (
              <p className="text-sm text-muted-foreground">
                M2 Completed: {formatDate(completionDate)}
              </p>
            )}
            <p className="text-sm font-medium text-foreground">
              💰 $4,000 Total Paid
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t border-subtle flex flex-col gap-3">
        <div className="flex items-center justify-between w-full">
          <Badge
            variant="outline"
            className="bg-primary/10 border-primary text-accent"
          >
            {track}
          </Badge>

          <div className="flex gap-2 flex-shrink-0">
            {demoUrl && (
              <ProjectCardActionButton
                title={title}
                url={demoUrl}
                type="demo"
              />
            )}
            {githubUrl && (
              <ProjectCardActionButton
                title={title}
                url={githubUrl}
                type="github"
              />
            )}
          </div>
        </div>

        {projectUrl && (
          <Button
            size="sm"
            variant="outline"
            onClick={onClick}
            className="w-full"
            aria-label={`View project details for ${title}`}
          >
            <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
            View Project
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

// Memoized action button component
const ProjectCardActionButton = memo(({
  title,
  url,
  type,
}: {
  title: string
  url: string
  type: "demo" | "github"
}) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(url, "_blank", "noopener,noreferrer")
  }, [url])

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 hover:bg-secondary hover:text-accent"
      aria-label={
        type === "demo"
          ? `View demo for ${title}`
          : `View GitHub repository for ${title}`
      }
      onClick={handleClick}
    >
      {type === "demo" ? (
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Github className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  )
})

ProjectCardActionButton.displayName = "ProjectCardActionButton"

// Memoized ProjectCard export
export const ProjectCard = memo(ProjectCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.author === nextProps.author &&
    prevProps.description === nextProps.description &&
    prevProps.track === nextProps.track &&
    prevProps.isWinner === nextProps.isWinner &&
    prevProps.demoUrl === nextProps.demoUrl &&
    prevProps.githubUrl === nextProps.githubUrl &&
    prevProps.projectUrl === nextProps.projectUrl &&
    prevProps.className === nextProps.className &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.m2Status === nextProps.m2Status &&
    prevProps.m2Week === nextProps.m2Week &&
    prevProps.showM2Progress === nextProps.showM2Progress &&
    prevProps.submittedDate === nextProps.submittedDate &&
    prevProps.completionDate === nextProps.completionDate
  )
})

ProjectCard.displayName = "ProjectCard"
