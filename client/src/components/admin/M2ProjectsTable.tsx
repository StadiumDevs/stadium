import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ExternalLink, 
  DollarSign,
  Eye,
  CheckCircle2,
  XCircle,
  Hammer,
  Clock,
} from "lucide-react"
import { useState } from "react"

interface M2ProjectsTableProps {
  projects: any[]
  onPaymentClick: (project: any) => void
}

export function M2ProjectsTable({ projects, onPaymentClick }: M2ProjectsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Show only projects with m2Status (M2 program projects only)
  const allProjects = (projects || []).filter(p => p.m2Status)

  // Helper to get m2Status badge
  const getM2StatusBadge = (m2Status?: string) => {
    if (!m2Status) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Not Started
        </Badge>
      )
    }
    
    switch (m2Status) {
      case 'building':
        return (
          <Badge variant="outline" className="bg-primary/10 border-primary">
            <Hammer className="h-3 w-3 mr-1" />
            Building
          </Badge>
        )
      case 'under_review':
        return (
          <Badge variant="outline" className="bg-orange-500/10 border-orange-500 text-orange-500">
            <Clock className="h-3 w-3 mr-1" />
            Under Review
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-500/10 border-green-500 text-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )
      default:
        return null
    }
  }

  const toggleRow = (projectId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedRows(newExpanded)
  }

  if (allProjects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No projects yet
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[20%]">Project</TableHead>
              <TableHead className="w-[15%]">Event</TableHead>
              <TableHead className="w-[15%]">Team Addresses</TableHead>
              <TableHead className="w-[12%]">Status</TableHead>
              <TableHead className="w-[14%]">M1 Payment</TableHead>
              <TableHead className="w-[14%]">M2 Payment</TableHead>
              <TableHead className="w-[10%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allProjects.map((project) => {
              const m1Payment = project.totalPaid?.find((p: any) => p.milestone === 'M1')
              const m2Payment = project.totalPaid?.find((p: any) => p.milestone === 'M2')
              const isExpanded = expandedRows.has(project.id)

              return (
                <TableRow 
                  key={project.id}
                  className="hover:bg-muted/30"
                >
                  {/* Project Name - from projectName field in DB */}
                  <TableCell>
                    <p className="font-semibold">{project.projectName}</p>
                  </TableCell>

                  {/* Event - from hackathon.name field in DB */}
                  <TableCell>
                    <p className="text-sm">{project.hackathon?.name || 'N/A'}</p>
                  </TableCell>

                  {/* Team Addresses - from teamMembers[].walletAddress field in DB */}
                  <TableCell>
                    <div className="space-y-1">
                      {project.teamMembers && project.teamMembers.length > 0 ? (
                        <>
                          {project.teamMembers.slice(0, isExpanded ? undefined : 2).map((member: any, idx: number) => (
                            member.walletAddress && (
                              <code key={idx} className="text-xs bg-muted px-2 py-1 rounded block">
                                {member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-4)}
                              </code>
                            )
                          ))}
                          {project.teamMembers.length > 2 && !isExpanded && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => toggleRow(project.id)}
                            >
                              +{project.teamMembers.length - 2} more
                            </Button>
                          )}
                          {isExpanded && project.teamMembers.length > 2 && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={() => toggleRow(project.id)}
                            >
                              Show less
                            </Button>
                          )}
                          {project.teamMembers.every((m: any) => !m.walletAddress) && (
                            <span className="text-xs text-muted-foreground">No addresses</span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">No team members</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Status - from m2Status field in DB */}
                  <TableCell>
                    {getM2StatusBadge(project.m2Status)}
                  </TableCell>

                  {/* M1 Payment - from totalPaid array in DB */}
                  <TableCell>
                    {m1Payment ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-sm font-medium">
                            ${m1Payment.amount.toLocaleString()} {m1Payment.currency}
                          </span>
                        </div>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          asChild
                        >
                          <a 
                            href={m1Payment.transactionProof}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View TX <ExternalLink className="ml-1 h-3 w-3 inline" />
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        <span className="text-sm">Not paid</span>
                      </div>
                    )}
                  </TableCell>

                  {/* M2 Payment - from totalPaid array in DB */}
                  <TableCell>
                    {m2Payment ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-sm font-medium">
                            ${m2Payment.amount.toLocaleString()} {m2Payment.currency}
                          </span>
                        </div>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          asChild
                        >
                          <a 
                            href={m2Payment.transactionProof}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View TX <ExternalLink className="ml-1 h-3 w-3 inline" />
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <XCircle className="h-3 w-3" />
                        <span className="text-sm">Not paid</span>
                      </div>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(`/m2-program/${project.id}`, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onPaymentClick(project)}
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

