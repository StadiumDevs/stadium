import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Github, Video, DollarSign } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"

interface M2GraduateCardProps {
  project: any
  index: number
}

export function M2GraduateCard({ project, index }: M2GraduateCardProps) {
  const navigate = useNavigate()
  const hasPaidM2 = project.totalPaid?.some((p: any) => p.milestone === 'M2')
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        className="cursor-pointer hover:border-green-500/50 transition-all h-full group bg-gradient-to-br from-green-500/5 to-transparent"
        onClick={() => navigate(`/projects/${project.id}`)}
      >
        <CardContent className="p-5">
          {/* Trophy Badge */}
          <div className="flex items-start justify-between mb-3">
            <Badge className="bg-green-500/10 border-green-500 text-green-500">
              <Trophy className="h-3 w-3 mr-1" />
              Graduate
            </Badge>
            {hasPaidM2 && (
              <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-500">
                <DollarSign className="h-3 w-3" />
              </Badge>
            )}
          </div>
          
          {/* Project Name */}
          <h3 className="font-semibold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {project.projectName}
          </h3>
          
          {/* Team */}
          <p className="text-sm text-muted-foreground mb-3">
            By {project.teamMembers?.[0]?.name || project.teamLead || 'Team'}
            {(project.teamMembers?.length || 0) > 1 && 
              ` +${project.teamMembers.length - 1} other${project.teamMembers.length - 1 > 1 ? 's' : ''}`
            }
          </p>
          
          {/* Description */}
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {project.description}
            </p>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-border">
            {project.githubRepo && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(project.githubRepo, '_blank')
                }}
              >
                <Github className="h-4 w-4 mr-1" />
                Code
              </Button>
            )}
            {project.demoUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(project.demoUrl, '_blank')
                }}
              >
                <Video className="h-4 w-4 mr-1" />
                Demo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

