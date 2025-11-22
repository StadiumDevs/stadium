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
  CheckCircle2,
  XCircle,
  DollarSign
} from "lucide-react"
import { format } from "date-fns"

interface PastPayoutsTableProps {
  projects: any[]
}

export function PastPayoutsTable({ projects }: PastPayoutsTableProps) {
  // Filter projects that have any payments
  const projectsWithPayments = projects.filter(
    p => p.totalPaid && p.totalPaid.length > 0
  )

  // Sort by most recent payment
  const sortedProjects = [...projectsWithPayments].sort((a, b) => {
    // Get most recent payment date from either project
    const getLatestDate = (project: any) => {
      if (!project.totalPaid || project.totalPaid.length === 0) return new Date(0)
      // Since we don't have paidDate in schema, use completionDate or updatedAt
      return new Date(project.completionDate || project.updatedAt || 0)
    }
    return getLatestDate(b).getTime() - getLatestDate(a).getTime()
  })

  // Calculate totals
  const totalAmount = projectsWithPayments.reduce((sum, project) => {
    const projectTotal = project.totalPaid?.reduce((pSum: number, payment: any) => 
      pSum + payment.amount, 0
    ) || 0
    return sum + projectTotal
  }, 0)

  const totalProjects = projectsWithPayments.length
  const m1Payments = projectsWithPayments.filter(p => 
    p.totalPaid?.some((payment: any) => payment.milestone === 'M1')
  ).length
  const m2Payments = projectsWithPayments.filter(p => 
    p.totalPaid?.some((payment: any) => payment.milestone === 'M2')
  ).length

  if (projectsWithPayments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No payouts recorded yet
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Paid Out</p>
            <p className="text-2xl font-bold">${totalAmount.toLocaleString()} USDC</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Projects Paid</p>
            <p className="text-2xl font-bold">{totalProjects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">M1 Payments</p>
            <p className="text-2xl font-bold">{m1Payments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">M2 Payments</p>
            <p className="text-2xl font-bold">{m2Payments}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[25%]">Project</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-[15%]">M1 Payment</TableHead>
                <TableHead className="w-[15%]">M2 Payment</TableHead>
                <TableHead className="w-[15%]">Total Paid</TableHead>
                <TableHead className="w-[15%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProjects.map((project) => {
                const m1Payment = project.totalPaid?.find((p: any) => p.milestone === 'M1')
                const m2Payment = project.totalPaid?.find((p: any) => p.milestone === 'M2')
                const totalPaid = project.totalPaid?.reduce((sum: number, p: any) => 
                  sum + p.amount, 0
                ) || 0

                return (
                  <TableRow 
                    key={project.id}
                    className="hover:bg-muted/30"
                  >
                    {/* Project Name */}
                    <TableCell>
                      <div>
                        <p className="font-semibold">{project.projectName}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.hackathon?.name || 'Hackathon'}
                        </p>
                        {project.donationAddress && (
                          <code className="text-xs bg-muted px-1 py-0.5 rounded mt-1 inline-block">
                            {project.donationAddress.slice(0, 6)}...{project.donationAddress.slice(-4)}
                          </code>
                        )}
                      </div>
                    </TableCell>

                    {/* M2 Status */}
                    <TableCell>
                      {project.m2Status === 'completed' ? (
                        <Badge variant="outline" className="bg-green-500/10 border-green-500 text-green-500">
                          ✅ Graduate
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          In Progress
                        </Badge>
                      )}
                    </TableCell>

                    {/* M1 Payment */}
                    <TableCell>
                      {m1Payment ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span className="text-sm font-medium">
                              ${m1Payment.amount.toLocaleString()}
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

                    {/* M2 Payment */}
                    <TableCell>
                      {m2Payment ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span className="text-sm font-medium">
                              ${m2Payment.amount.toLocaleString()}
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

                    {/* Total Paid */}
                    <TableCell>
                      <div className="font-semibold">
                        ${totalPaid.toLocaleString()} USDC
                      </div>
                      {project.completionDate && (
                        <p className="text-xs text-muted-foreground">
                          Completed: {format(new Date(project.completionDate), 'MMM d, yyyy')}
                        </p>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/m2-program/${project.id}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

