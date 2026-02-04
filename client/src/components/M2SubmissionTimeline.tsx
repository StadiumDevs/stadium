import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Rocket, 
  CheckCircle2, 
  Circle,
  Upload
} from "lucide-react";
import { format } from "date-fns";

interface M2SubmissionTimelineProps {
  project: any;
  isTeamMember: boolean;
  isAdmin: boolean;
  isConnected: boolean;
  connectedWallet?: string | null;
  onSubmit: () => void;
}

export function M2SubmissionTimeline({ 
  project, 
  isTeamMember, 
  isAdmin,
  isConnected,
  connectedWallet,
  onSubmit 
}: M2SubmissionTimelineProps) {
  // Determine checklist states based on project data
  const isPlanAgreed = !!project.m2Agreement;
  const isDeliveryCompleted = !!project.finalSubmission;
  const isApproved = project.m2Status === 'completed';
  const isPayoutConfirmed = project.totalPaid?.some(
    (payment: { milestone: string }) => payment.milestone === 'M2'
  );
  
  // Check if there are incomplete milestones (show submit button)
  const hasIncompleteMilestones = !isDeliveryCompleted && isPlanAgreed;
  
  // Can submit if team member or admin, plan is agreed, and not yet submitted
  const canSubmit = (isTeamMember || isAdmin) && hasIncompleteMilestones && isConnected;
  
  return (
    <Card className="glass-panel border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            M2 Program Progress
          </CardTitle>
          <Badge 
            variant={
              project.m2Status === 'completed' ? 'default' : 
              project.m2Status === 'under_review' ? 'secondary' : 
              'outline'
            }
            className={
              project.m2Status === 'completed' ? 'bg-green-500/10 border-green-500 text-green-500' :
              project.m2Status === 'under_review' ? 'bg-orange-500/10 border-orange-500 text-orange-500' :
              'bg-primary/10 border-primary text-primary'
            }
          >
            {project.m2Status === 'building' && '🔨 Building'}
            {project.m2Status === 'under_review' && '⏳ Under Review'}
            {project.m2Status === 'completed' && '✅ Completed'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Checklist */}
        <div className="space-y-3">
          {/* M2 Plan Agreed */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            {isPlanAgreed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
            <span className={`text-sm font-medium ${isPlanAgreed ? 'text-foreground' : 'text-muted-foreground'}`}>
              M2 Plan Agreed
            </span>
            {isPlanAgreed && project.m2Agreement?.agreedDate && (
              <span className="text-xs text-muted-foreground ml-auto">
                {format(new Date(project.m2Agreement.agreedDate), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          
          {/* M2 Delivery Completed */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            {isDeliveryCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
            <span className={`text-sm font-medium ${isDeliveryCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
              M2 Delivery Completed
            </span>
            {isDeliveryCompleted && project.finalSubmission?.submittedDate && (
              <span className="text-xs text-muted-foreground ml-auto">
                {format(new Date(project.finalSubmission.submittedDate), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          
          {/* M2 Approved */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            {isApproved ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
            <span className={`text-sm font-medium ${isApproved ? 'text-foreground' : 'text-muted-foreground'}`}>
              M2 Approved
            </span>
            {isApproved && project.completionDate && (
              <span className="text-xs text-muted-foreground ml-auto">
                {format(new Date(project.completionDate), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          
          {/* Payout Confirmed */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            {isPayoutConfirmed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
            <span className={`text-sm font-medium ${isPayoutConfirmed ? 'text-foreground' : 'text-muted-foreground'}`}>
              Payout Confirmed
            </span>
            {isPayoutConfirmed && (
              <span className="text-xs text-muted-foreground ml-auto">
                {(() => {
                  const m2Payment = project.totalPaid?.find(
                    (p: { milestone: string }) => p.milestone === 'M2'
                  );
                  if (!m2Payment) return '';
                  return m2Payment.currency === 'DOT' 
                    ? `${m2Payment.amount.toLocaleString()} DOT`
                    : `$${m2Payment.amount.toLocaleString()} ${m2Payment.currency}`;
                })()}
              </span>
            )}
          </div>
        </div>

        {/* Agreed Deliverables Section */}
        {(() => {
          // Get deliverables from m2Agreement.agreedFeatures or fallback to project.milestones
          const deliverables = project.m2Agreement?.agreedFeatures || project.milestones || [];
          const hasDeliverables = deliverables.length > 0;
          
          if (!hasDeliverables) return null;
          
          return (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Agreed Deliverables</h3>
              <div className="bg-muted/20 rounded-lg p-4 space-y-2">
                {deliverables.map((item: string | { description?: string }, index: number) => {
                  const text = typeof item === 'string' ? item : item.description || '';
                  if (!text) return null;
                  return (
                    <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary">•</span>
                      <span>{text}</span>
                    </div>
                  );
                })}
              </div>
              {project.m2Agreement?.successCriteria && (
                <div className="text-sm">
                  <span className="font-medium text-foreground">Success Criteria: </span>
                  <span className="text-muted-foreground">{project.m2Agreement.successCriteria}</span>
                </div>
              )}
            </div>
          );
        })()}
        
        {/* Submitted Alert */}
        {isDeliveryCompleted && (
          <Alert className="bg-green-500/10 border-green-500/30">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold text-green-500">
                  ✅ Deliverables submitted on {format(new Date(project.finalSubmission.submittedDate), 'MMMM d, yyyy')}
                </p>
                <p className="text-sm text-foreground">
                  {project.m2Status === 'under_review' && 
                    'WebZero is reviewing your submission.'}
                  {project.m2Status === 'completed' && 
                    'Your M2 has been approved! Check Payment History for transaction details.'}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Submit Button - Only show if incomplete milestones */}
        {hasIncompleteMilestones && (
          <div className="pt-2">
            {!isConnected ? (
              <Alert className="bg-muted border-border">
                <AlertDescription className="text-sm text-center text-muted-foreground">
                  Connect your wallet to submit deliverables
                </AlertDescription>
              </Alert>
            ) : !isTeamMember && !isAdmin ? (
              <Alert className="bg-muted border-border">
                <AlertDescription className="text-sm text-center text-muted-foreground">
                  Only team members can submit deliverables
                </AlertDescription>
              </Alert>
            ) : (
              <Button
                className="w-full"
                size="lg"
                onClick={onSubmit}
              >
                <Upload className="mr-2 h-5 w-5" />
                Submit Milestone
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
