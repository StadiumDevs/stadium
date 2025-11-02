import { memo, useCallback } from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Github, Trophy } from "lucide-react"
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
}: ProjectCardProps) {
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
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-heading text-xl font-bold text-foreground mb-1 line-clamp-1">
              {title}
            </h3>
            <p className="text-sm font-medium text-accent">By {author}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {description}
        </p>
      </CardContent>

      <CardFooter className="pt-3 border-t border-subtle flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
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
    prevProps.onClick === nextProps.onClick
  )
})

ProjectCard.displayName = "ProjectCard"
