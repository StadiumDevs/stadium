import { useState } from "react"
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  ExternalLink, 
  CheckCircle2,
  Clock,
  Users,
  DollarSign
} from "lucide-react"
import { toast } from "sonner"
import { calculateM2Timeline } from "@/lib/projectUtils"
import { format } from "date-fns"
import { TeamAddressList } from "./TeamAddressList"
import { ConfirmPaymentModal } from "./ConfirmPaymentModal"
import { api } from "@/lib/api"

interface M2BuildingProjectsTableProps {
  projects: any[]
}

export function M2BuildingProjectsTable({ projects }: M2BuildingProjectsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)

  const toggleRow = (projectId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedRows(newExpanded)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  const handleConfirmPayment = async (data: any) => {
    if (!selectedProject) return

    try {
      const response = await fetch(`/api/m2-program/${selectedProject.id}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to confirm payment')
      }

      // Reload to refresh data
      window.location.reload()
    } catch (error: any) {
      throw new Error(error.message || 'Failed to confirm payment')
    }
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No projects currently in building phase
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[25%]">Project</TableHead>
              <TableHead className="w-[15%]">Week Progress</TableHead>
              <TableHead className="w-[15%]">Team Size</TableHead>
              <TableHead className="w-[20%]">Payout Address</TableHead>
              <TableHead className="w-[15%]">Timeline</TableHead>
              <TableHead className="w-[10%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => {
              const timeline = project.hackathon?.endDate
                ? calculateM2Timeline(project.hackathon.endDate)
                : null
              const isExpanded = expandedRows.has(project.id)

              return (
                <>
                  {/* Main Row */}
                  <TableRow key={project.id} className="hover:bg-muted/30">
                    {/* Expand Button */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleRow(project.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>

                    {/* Project Name */}
                    <TableCell>
                      <div>
                        <p className="font-semibold">{project.projectName}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.hackathon?.name || 'Hackathon'}
                        </p>
                      </div>
                    </TableCell>

                    {/* Week Progress */}
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="bg-primary/10 border-primary">
                          Week {timeline?.currentWeek || '?'} of 6
                        </Badge>
                        {timeline && timeline.currentWeek <= 4 && (
                          <p className="text-xs text-muted-foreground">
                            Building Phase
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Team Size */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {project.teamMembers?.length || 0}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {project.teamMembers?.length === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Payout Address (Truncated) */}
                    <TableCell>
                      {project.donationAddress ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {project.donationAddress.slice(0, 6)}...{project.donationAddress.slice(-4)}
                          </code>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard(project.donationAddress, 'Payout address')}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-mono text-xs">{project.donationAddress}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ) : (
                        <span className="text-xs text-destructive">Not set</span>
                      )}
                    </TableCell>

                    {/* Timeline */}
                    <TableCell>
                      {timeline && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            <span>
                              {timeline.daysUntilSubmissionOpens > 0
                                ? `${timeline.daysUntilSubmissionOpens}d until submit`
                                : 'Can submit now'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Opens: {format(timeline.week5OpenDate, 'MMM d')}
                          </p>
                        </div>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Payment Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedProject(project)
                            setPaymentModalOpen(true)
                          }}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Payment
                        </Button>
                        
                        {/* View Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`/m2-program/${project.id}`, '_blank')
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded Details Row */}
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/20">
                        <div className="p-4 space-y-4">
                          {/* M2 Agreement Summary */}
                          {project.m2Agreement && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                📋 M2 Roadmap
                                {project.m2Agreement.lastUpdatedDate && (
                                  <span className="text-xs font-normal text-muted-foreground">
                                    Updated: {format(new Date(project.m2Agreement.lastUpdatedDate), 'MMM d, yyyy')}
                                  </span>
                                )}
                              </h4>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="font-medium text-xs text-muted-foreground mb-1">Core Features</p>
                                  <p className="text-xs">
                                    {project.m2Agreement.agreedFeatures?.length || 0} features defined
                                  </p>
                                </div>
                                <div>
                                  <p className="font-medium text-xs text-muted-foreground mb-1">Documentation</p>
                                  <p className="text-xs">
                                    {project.m2Agreement.documentation?.length || 0} items required
                                  </p>
                                </div>
                                <div>
                                  <p className="font-medium text-xs text-muted-foreground mb-1">Success Criteria</p>
                                  <p className="text-xs">
                                    {project.m2Agreement.successCriteria ? '✓ Defined' : '✗ Not set'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Team Members with FULL Addresses */}
                          <div>
                            <h4 className="text-sm font-semibold mb-2">👥 Team Members & Wallet Addresses</h4>
                            <TeamAddressList 
                              teamMembers={project.teamMembers || []} 
                              payoutAddress={project.donationAddress}
                            />
                          </div>

                          {/* Payment History */}
                          <div>
                            <h4 className="text-sm font-semibold mb-2">💰 Payment History</h4>
                            <div className="space-y-2">
                              {/* M1 Payment */}
                              <div className="bg-card border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Milestone 1</span>
                                    {project.totalPaid?.find((p: any) => p.milestone === 'M1') ? (
                                      <Badge variant="outline" className="bg-green-500/10 border-green-500 text-green-500">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Paid
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">Pending</Badge>
                                    )}
                                  </div>
                                  <span className="font-bold">$2,000 USDC</span>
                                </div>
                                
                                {project.totalPaid?.find((p: any) => p.milestone === 'M1') && (
                                  <div className="space-y-1">
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-xs"
                                      asChild
                                    >
                                      <a 
                                        href={project.totalPaid.find((p: any) => p.milestone === 'M1').transactionProof}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        View Transaction <ExternalLink className="ml-1 h-3 w-3 inline" />
                                      </a>
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* M2 Payment */}
                              <div className="bg-card border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Milestone 2</span>
                                    {project.totalPaid?.find((p: any) => p.milestone === 'M2') ? (
                                      <Badge variant="outline" className="bg-green-500/10 border-green-500 text-green-500">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Paid
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline">
                                        {project.m2Status === 'under_review' ? 'Pending Approval' : 'Not Due'}
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="font-bold">$2,000 USDC</span>
                                </div>
                                
                                {project.totalPaid?.find((p: any) => p.milestone === 'M2') ? (
                                  <div className="space-y-1">
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-xs"
                                      asChild
                                    >
                                      <a 
                                        href={project.totalPaid.find((p: any) => p.milestone === 'M2').transactionProof}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        View Transaction <ExternalLink className="ml-1 h-3 w-3 inline" />
                                      </a>
                                    </Button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Due upon M2 submission approval and completion
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    {/* Payment Confirmation Modal */}
    {selectedProject && (
      <ConfirmPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        project={selectedProject}
        onConfirm={handleConfirmPayment}
      />
    )}
    </>
  )
}

