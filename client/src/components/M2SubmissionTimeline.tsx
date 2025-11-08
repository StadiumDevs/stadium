import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Rocket, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Github,
  Video,
  FileText,
  Lock
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { calculateM2Timeline } from "@/lib/projectUtils";

interface M2SubmissionTimelineProps {
  project: any;
  isTeamMember: boolean;
  isAdmin: boolean;
  onSubmit: () => void;
}

export function M2SubmissionTimeline({ 
  project, 
  isTeamMember, 
  isAdmin, 
  onSubmit 
}: M2SubmissionTimelineProps) {
  // Calculate current week and timeline status
  const timeline = calculateM2Timeline(project.hackathon?.endDate);
  
  // Determine if user can submit
  const canSubmit = (isTeamMember || isAdmin) && 
                    timeline.canSubmit && 
                    !project.finalSubmission;
  
  const alreadySubmitted = !!project.finalSubmission;
  
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
        {/* Week Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Week {timeline.currentWeek} of 6
            </span>
            <span className="font-medium text-foreground">
              {timeline.currentWeek <= 4 ? 'Building Phase' :
               timeline.currentWeek <= 6 ? 'Submission Window' :
               'Review Phase'}
            </span>
          </div>
          <Progress 
            value={(Math.min(timeline.currentWeek, 6) / 6) * 100} 
            className="h-2"
          />
        </div>
        
        {/* Visual Timeline */}
        <div className="relative py-4">
          {/* Progress Line */}
          <div className="absolute top-9 left-0 right-0 h-0.5 bg-border">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(Math.min(timeline.currentWeek, 6) / 6) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          
          {/* Timeline Nodes */}
          <div className="relative flex justify-between items-start">
            {/* Week 1-4: Building */}
            <div className="flex flex-col items-center flex-1">
              <motion.div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 z-10 ${
                  timeline.currentWeek >= 1 && timeline.currentWeek <= 4
                    ? 'bg-primary border-primary shadow-lg shadow-primary/50'
                    : timeline.currentWeek > 4
                    ? 'bg-green-500/20 border-green-500/50'
                    : 'bg-background border-border'
                }`}
                whileHover={{ scale: 1.05 }}
              >
                {timeline.currentWeek > 4 ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <span className="text-sm font-bold text-foreground">1-4</span>
                )}
              </motion.div>
              <div className="mt-3 text-center">
                <p className="text-sm font-medium text-foreground">Weeks 1-4</p>
                <p className="text-xs text-muted-foreground">Building</p>
              </div>
            </div>
            
            {/* Week 5: Submit Opens */}
            <div className="flex flex-col items-center flex-1">
              <motion.div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 z-10 ${
                  timeline.currentWeek === 5
                    ? 'bg-primary border-primary shadow-lg shadow-primary/50'
                    : timeline.currentWeek > 5
                    ? 'bg-green-500/20 border-green-500/50'
                    : 'bg-background border-border'
                }`}
                whileHover={{ scale: 1.05 }}
              >
                {timeline.currentWeek > 5 ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : timeline.currentWeek === 5 ? (
                  <Rocket className="h-6 w-6 text-primary-foreground" />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">5</span>
                )}
              </motion.div>
              <div className="mt-3 text-center">
                <p className="text-sm font-medium text-foreground">Week 5</p>
                <p className="text-xs text-muted-foreground">Submit Opens</p>
              </div>
            </div>
            
            {/* Week 6: Deadline */}
            <div className="flex flex-col items-center flex-1">
              <motion.div
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 z-10 ${
                  timeline.currentWeek === 6
                    ? 'bg-orange-500 border-orange-500 shadow-lg shadow-orange-500/50'
                    : timeline.currentWeek > 6
                    ? 'bg-green-500/20 border-green-500/50'
                    : 'bg-background border-border'
                }`}
                whileHover={{ scale: 1.05 }}
                animate={timeline.currentWeek === 6 ? {
                  scale: [1, 1.1, 1],
                  transition: { repeat: Infinity, duration: 2 }
                } : {}}
              >
                {timeline.currentWeek > 6 ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : timeline.currentWeek === 6 ? (
                  <Clock className="h-6 w-6 text-white" />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">6</span>
                )}
              </motion.div>
              <div className="mt-3 text-center">
                <p className="text-sm font-medium text-foreground">Week 6</p>
                <p className="text-xs text-muted-foreground">Deadline</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Status-Specific Alerts */}
        
        {/* Weeks 1-4: Building Phase */}
        {timeline.currentWeek <= 4 && !alreadySubmitted && (
          <Alert className="bg-primary/5 border-primary/20">
            <Calendar className="h-4 w-4 text-primary" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold text-foreground">
                  📅 Current: Week {timeline.currentWeek} of 6 (Building Phase)
                </p>
                <p className="text-sm text-muted-foreground">
                  ⏰ Submission opens: {format(timeline.week5OpenDate, 'MMMM d, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground">
                  💡 Keep building! Submission opens in {timeline.daysUntilSubmissionOpens} days.
                  Use this time to complete your M2 roadmap above.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Week 5: Submission Window Open */}
        {timeline.currentWeek === 5 && !alreadySubmitted && (
          <Alert className="bg-green-500/10 border-green-500/30">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold text-green-500">
                  ✅ Submission window is OPEN! {timeline.daysUntilDeadline} days remaining
                </p>
                <div className="space-y-2 text-sm text-foreground">
                  <p className="font-medium">Ready to submit? Make sure you have:</p>
                  <div className="space-y-1.5 ml-2">
                    <div className="flex items-center gap-2">
                      <Github className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span>GitHub repo with latest code</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span>Demo video (YouTube/Loom link)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span>Documentation (README, setup guide)</span>
                    </div>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Week 6: Final Week */}
        {timeline.currentWeek === 6 && !alreadySubmitted && (
          <Alert className="bg-orange-500/10 border-orange-500/30">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold text-orange-500">
                  ⏰ FINAL WEEK! Deadline: {format(timeline.deadlineDate, 'MMMM d, yyyy')}
                  {timeline.daysUntilDeadline > 0 && ` (${timeline.daysUntilDeadline} days left)`}
                </p>
                <div className="space-y-2 text-sm text-foreground">
                  <p className="font-medium">Ready to submit? Make sure you have:</p>
                  <div className="space-y-1.5 ml-2">
                    <div className="flex items-center gap-2">
                      <Github className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span>GitHub repo with latest code</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span>Demo video (YouTube/Loom link)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span>Documentation (README, setup guide)</span>
                    </div>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Past Deadline */}
        {timeline.isPastDeadline && !alreadySubmitted && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold">⚠️ Submission deadline has passed</p>
                <p className="text-sm">
                  Need an extension? Contact WebZero:{" "}
                  <a href="mailto:sacha@joinwebzero.com" className="underline hover:text-destructive-foreground">
                    sacha@joinwebzero.com
                  </a>
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Already Submitted */}
        {alreadySubmitted && (
          <Alert className="bg-green-500/10 border-green-500/30">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-semibold text-green-500">
                  ✅ Deliverables submitted on {format(new Date(project.finalSubmission.submittedDate), 'MMMM d, yyyy')}
                </p>
                <p className="text-sm text-foreground">
                  {project.m2Status === 'under_review' && 
                    'WebZero is reviewing your submission. Check the Review Status section below for updates.'}
                  {project.m2Status === 'completed' && 
                    'Your M2 has been approved! Check Payment History for transaction details.'}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Action Button */}
        {!alreadySubmitted && (
          <div className="pt-2">
            {canSubmit ? (
              <Button
                className="w-full"
                size="lg"
                onClick={onSubmit}
              >
                <Rocket className="mr-2 h-5 w-5" />
                🎯 Submit M2 Deliverables
              </Button>
            ) : timeline.currentWeek <= 4 ? (
              <Button
                variant="outline"
                className="w-full"
                disabled
              >
                <Lock className="mr-2 h-4 w-4" />
                Submit Opens Week 5 ({format(timeline.week5OpenDate, 'MMM d')})
              </Button>
            ) : timeline.isPastDeadline ? (
              <Button
                variant="outline"
                className="w-full"
                disabled
              >
                Submission Closed
              </Button>
            ) : !isTeamMember && !isAdmin ? (
              <Alert className="bg-muted">
                <AlertDescription className="text-sm text-muted-foreground">
                  Connect your wallet to submit deliverables
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        )}
        
        {/* Help Text */}
        <p className="text-xs text-center text-muted-foreground">
          Need help? Contact your mentor in Telegram
        </p>
      </CardContent>
    </Card>
  );
}

