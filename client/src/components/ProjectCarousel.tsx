import { useCallback, memo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, ExternalLink } from "lucide-react"

interface Project {
  id: string
  title: string
  author: string
  description: string
  track: string
  isWinner: boolean
  demoUrl?: string
  projectUrl?: string
}

interface ProjectCarouselProps {
  projects: Project[]
  onProjectClick?: (project: Project) => void
}

function ProjectCarouselComponent({ projects, onProjectClick }: ProjectCarouselProps) {
  const navigate = useNavigate()

  const handleCardClick = useCallback((project: Project) => {
    onProjectClick?.(project)
  }, [onProjectClick])

  const handleKeyDown = useCallback((e: React.KeyboardEvent, project: Project) => {
    if (onProjectClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault()
      onProjectClick(project)
    }
  }, [onProjectClick])

  const handleProjectPageClick = useCallback((e: React.MouseEvent, projectUrl: string) => {
    e.stopPropagation()
    navigate(projectUrl)
  }, [navigate])

  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full"
    >
      <CarouselContent className="-ml-4">
        {projects.map((project) => (
          <CarouselItem key={project.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
            <Card
              role="button"
              tabIndex={onProjectClick ? 0 : undefined}
              aria-label={`View project details for ${project.title}`}
              className="h-full cursor-pointer transition-all duration-300 hover:border-primary hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => handleCardClick(project)}
              onKeyDown={(e) => handleKeyDown(e, project)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Badge
                      variant="outline"
                      className="mb-2 bg-yellow-500/10 border-yellow-500 text-yellow-500"
                    >
                      <Trophy className="w-3 h-3 mr-1" aria-hidden="true" />
                      Winner
                    </Badge>
                    <h3 className="font-heading text-lg font-bold line-clamp-1">{project.title}</h3>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pb-3">
                <p className="text-sm text-accent font-medium mb-2">
                  {project.author}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              </CardContent>

              <CardFooter className="pt-3 border-t border-subtle flex justify-between">
                <Badge variant="outline" className="bg-primary/10 border-primary text-accent">
                  {project.track}
                </Badge>

                <div className="flex gap-2">
                  {project.demoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(project.demoUrl, "_blank", "noopener,noreferrer")
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" aria-hidden="true" />
                      View Demo
                    </Button>
                  )}
                  {project.projectUrl && (
                    <Button
                      size="sm"
                      onClick={(e) => handleProjectPageClick(e, project.projectUrl!)}
                    >
                      Project Page
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden md:flex" />
      <CarouselNext className="hidden md:flex" />
    </Carousel>
  )
}

// Memoized ProjectCarousel
export const ProjectCarousel = memo(ProjectCarouselComponent, (prevProps, nextProps) => {
  return (
    prevProps.projects === nextProps.projects &&
    prevProps.onProjectClick === nextProps.onProjectClick
  )
})

ProjectCarousel.displayName = "ProjectCarousel"
