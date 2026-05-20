import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

const statusPill = (m2Status?: string) => {
  const base =
    "inline-flex items-center gap-1 px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase";
  switch (m2Status) {
    case "building":
      return (
        <span className={`${base} border border-hairline text-display bg-panel-deep`}>
          <Hammer className="h-2.5 w-2.5" />
          BUILDING
        </span>
      );
    case "under_review":
      return (
        <span className={`${base} border border-hairline text-display bg-panel-deep`}>
          <Clock className="h-2.5 w-2.5" />
          UNDER REVIEW
        </span>
      );
    case "completed":
      return (
        <span className={`${base} border border-led bg-led text-shell`}>
          <CheckCircle2 className="h-2.5 w-2.5" />
          COMPLETED
        </span>
      );
    default:
      return (
        <span className={`${base} border border-hairline text-label-mid`}>
          NOT STARTED
        </span>
      );
  }
};

export function M2ProjectsTable({ projects, onPaymentClick }: M2ProjectsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const allProjects = (projects || []).filter(p => p.m2Status)

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
      <div className="panel p-10 text-center">
        <span className="label-hw-dim">·NO PROJECTS YET</span>
      </div>
    )
  }

  return (
    <div className="panel p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-panel-deep">
            <TableHead className="w-[20%] label-hw-dim">PROJECT</TableHead>
            <TableHead className="w-[15%] label-hw-dim">EVENT</TableHead>
            <TableHead className="w-[15%] label-hw-dim">TEAM ADDRESSES</TableHead>
            <TableHead className="w-[12%] label-hw-dim">STATUS</TableHead>
            <TableHead className="w-[14%] label-hw-dim">M1 PAYMENT</TableHead>
            <TableHead className="w-[14%] label-hw-dim">M2 PAYMENT</TableHead>
            <TableHead className="w-[10%] text-right label-hw-dim">ACTIONS</TableHead>
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
                className="hover:bg-panel-deep"
              >
                {/* Project Name */}
                <TableCell>
                  <p className="font-semibold text-display">{project.projectName}</p>
                </TableCell>

                {/* Event */}
                <TableCell>
                  <p className="text-sm text-body">{project.hackathon?.name || 'N/A'}</p>
                </TableCell>

                {/* Team Addresses */}
                <TableCell>
                  <div className="space-y-1">
                    {project.teamMembers && project.teamMembers.length > 0 ? (
                      <>
                        {project.teamMembers.slice(0, isExpanded ? undefined : 2).map((member: any, idx: number) => (
                          member.walletAddress && (
                            <code key={idx} className="text-[10px] bg-panel-deep px-2 py-0.5 rounded-sm block font-mono text-display border border-hairline-subtle">
                              {member.walletAddress.slice(0, 6)}…{member.walletAddress.slice(-4)}
                            </code>
                          )
                        ))}
                        {project.teamMembers.length > 2 && !isExpanded && (
                          <button
                            type="button"
                            className="label-hw-dim hover:text-display"
                            onClick={() => toggleRow(project.id)}
                          >
                            +{project.teamMembers.length - 2} MORE
                          </button>
                        )}
                        {isExpanded && project.teamMembers.length > 2 && (
                          <button
                            type="button"
                            className="label-hw-dim hover:text-display"
                            onClick={() => toggleRow(project.id)}
                          >
                            SHOW LESS
                          </button>
                        )}
                        {project.teamMembers.every((m: any) => !m.walletAddress) && (
                          <span className="label-hw-dim">NO ADDRESSES</span>
                        )}
                      </>
                    ) : (
                      <span className="label-hw-dim">NO TEAM MEMBERS</span>
                    )}
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  {statusPill(project.m2Status)}
                </TableCell>

                {/* M1 Payment */}
                <TableCell>
                  {m1Payment ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-led" />
                        <span className="text-sm font-medium font-mono text-display">
                          ${m1Payment.amount.toLocaleString()} {m1Payment.currency}
                        </span>
                      </div>
                      <a
                        href={m1Payment.transactionProof}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="label-hw-dim hover:text-display inline-flex items-center gap-0.5"
                      >
                        VIEW TX <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-label-mid">
                      <XCircle className="h-3 w-3" />
                      <span className="text-sm font-mono">Not paid</span>
                    </div>
                  )}
                </TableCell>

                {/* M2 Payment */}
                <TableCell>
                  {m2Payment ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-led" />
                        <span className="text-sm font-medium font-mono text-display">
                          ${m2Payment.amount.toLocaleString()} {m2Payment.currency}
                        </span>
                      </div>
                      <a
                        href={m2Payment.transactionProof}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="label-hw-dim hover:text-display inline-flex items-center gap-0.5"
                      >
                        VIEW TX <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-label-mid">
                      <XCircle className="h-3 w-3" />
                      <span className="text-sm font-mono">Not paid</span>
                    </div>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center border border-hairline text-display hover:bg-panel-deep w-7 h-7"
                      onClick={() => window.open(`/m2-program/${project.id}`, '_blank')}
                      aria-label="Open project page"
                    >
                      <Eye className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center border border-hairline text-display hover:bg-panel-deep w-7 h-7"
                      onClick={() => onPaymentClick(project)}
                      aria-label="Record payment"
                    >
                      <DollarSign className="h-3 w-3" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
