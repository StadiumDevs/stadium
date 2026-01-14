import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  ExternalLink, 
  Github, 
  Video,
  FileText,
  DollarSign
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { getCurrentProgramWeek } from "@/lib/projectUtils"

interface M2ProjectTableProps {
  projects: any[]
}

export function M2ProjectTable({ projects }: M2ProjectTableProps) {
  const navigate = useNavigate()
  const currentWeek = getCurrentProgramWeek()
  
  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No projects to display
      </div>
    )
  }

  // Helper to get status badge
  const getStatusBadge = (status: string, totalPaid?: any[]) => {
    const hasPaidM2 = totalPaid?.some(p => p.milestone === 'M2')
    
    if (status === 'building') {
      return (
        <Badge variant="outline" className="bg-primary/10 border-primary text-primary">
          🔨 Week {currentWeek.weekNumber} of 6
        </Badge>
      )
    }
    if (status === 'under_review') {
      return (
        <Badge variant="outline" className="bg-orange-500/10 border-orange-500 text-orange-500">
          ⏳ Under Review
        </Badge>
      )
    }
    if (status === 'completed') {
      return (
        <Badge variant="outline" className="bg-green-500/10 border-green-500 text-green-500">
          ✅ Graduate {hasPaidM2 ? '($)' : ''}
        </Badge>
      )
    }
    return null
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[35%]">Project</TableHead>
              <TableHead className="w-[20%]">Team</TableHead>
              <TableHead className="w-[20%]">Status</TableHead>
              <TableHead className="w-[25%] text-right">Links</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => {
              return (
                <TableRow 
                  key={project.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(`/m2-program/${project.id}`)}
                >
                  {/* Project Name */}
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-semibold line-clamp-1">{project.projectName}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {project.description || 'No description'}
                      </p>
                    </div>
                  </TableCell>
                  
                  {/* Team */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {project.teamMembers?.slice(0, 3).map((member: any, idx: number) => (
                          <Avatar key={idx} className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {member.name?.slice(0, 2).toUpperCase() || '??'}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {(project.teamMembers?.length || 0) > 3 && (
                          <Avatar className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className="text-xs bg-muted">
                              +{project.teamMembers.length - 3}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {project.teamMembers?.length || 0}
                      </span>
                    </div>
                  </TableCell>
                  
                  {/* Status */}
                  <TableCell>
                    {getStatusBadge(project.m2Status, project.totalPaid)}
                  </TableCell>
                  
                  {/* Links */}
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {project.githubRepo && project.githubRepo !== "nan" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(project.githubRepo, '_blank')
                          }}
                          title="GitHub"
                        >
                          <Github className="h-4 w-4" />
                        </Button>
                      )}
                      {project.demoUrl && project.demoUrl !== "nan" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(project.demoUrl, '_blank')
                          }}
                          title="Demo"
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      )}
                      {project.slidesUrl && project.slidesUrl !== "nan" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(project.slidesUrl, '_blank')
                          }}
                          title="Slides"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2 h-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/m2-program/${project.id}`)
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

