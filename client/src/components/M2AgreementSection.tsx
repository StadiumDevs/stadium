import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Edit, 
  Lock, 
  Calendar, 
  CheckCircle, 
  Target,
  BookOpen,
  Lightbulb,
  AlertCircle
} from "lucide-react";
import { EditM2AgreementModal } from "@/components/EditM2AgreementModal";
import { format } from "date-fns";
import { getCurrentProgramWeek } from "@/lib/projectUtils";

interface M2Agreement {
  mentorName?: string;
  agreedDate: string;
  agreedFeatures: string[];
  documentation?: string[];
  successCriteria?: string;
  lastUpdatedBy?: 'team' | 'admin';
  lastUpdatedDate?: string;
}

interface M2AgreementSectionProps {
  projectId: string;
  m2Agreement?: M2Agreement;
  hackathonEndDate?: string;
  isTeamMember: boolean;
  onUpdate: () => void;
}

export function M2AgreementSection({ 
  projectId,
  m2Agreement, 
  hackathonEndDate,
  isTeamMember,
  onUpdate
}: M2AgreementSectionProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const currentWeek = getCurrentProgramWeek();
  const canEdit = isTeamMember && currentWeek.weekNumber >= 1 && currentWeek.weekNumber <= 4;
  const isPastWeek4 = currentWeek.weekNumber > 4;

  // Empty state - no agreement created yet
  if (!m2Agreement) {
    return (
      <>
        <div className="glass-panel rounded-lg p-8 mb-6 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-heading mb-2">No M2 Roadmap Created Yet</h3>
          <p className="text-muted-foreground mb-4">
            Define your 6-week development plan to get started with the M2 Incubator Program
          </p>
          {isTeamMember && (
            <Button 
              onClick={() => setIsEditModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create Your M2 Roadmap
            </Button>
          )}
        </div>
        
        <EditM2AgreementModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          projectId={projectId}
          currentAgreement={undefined}
          currentWeek={currentWeek.weekNumber}
          onSuccess={onUpdate}
        />
      </>
    );
  }

  // Format the last updated date
  const lastUpdated = m2Agreement.lastUpdatedDate 
    ? format(new Date(m2Agreement.lastUpdatedDate), 'MMM d, yyyy')
    : format(new Date(m2Agreement.agreedDate), 'MMM d, yyyy');
  
  const updatedBy = m2Agreement.lastUpdatedBy === 'team' ? 'Your Team' : 'Admin';

  return (
    <>
      <div className="glass-panel rounded-lg p-6 mb-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-purple-500" />
              <h2 className="text-2xl font-heading">📋 Your M2 Roadmap</h2>
              {isPastWeek4 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Locked
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Last updated: {lastUpdated} by {updatedBy}</span>
            </div>
          </div>
          
          {/* Edit Button */}
          {isTeamMember && canEdit && (
            <Button 
              onClick={() => setIsEditModalOpen(true)}
              variant="outline"
              className="ml-4"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Roadmap
            </Button>
          )}
        </div>

        {/* Core Features Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold">Core Features (must complete)</h3>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <ul className="space-y-2">
              {m2Agreement.agreedFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span className="flex-1">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Documentation Requirements Section */}
        {m2Agreement.documentation && m2Agreement.documentation.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold">Documentation Requirements</h3>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <ul className="space-y-2">
                {m2Agreement.documentation.map((doc, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span className="flex-1">{doc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Success Criteria Section */}
        {m2Agreement.successCriteria && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold">Success Criteria</h3>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {m2Agreement.successCriteria}
              </p>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-border/50">
          {!isPastWeek4 ? (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lightbulb className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" />
              <p>
                💡 This is YOUR plan agreed with your mentors. Update anytime during Weeks 1-4.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-500/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Roadmap locked after Week 4. Contact your mentors in your team chat if you need to make any changes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <EditM2AgreementModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        projectId={projectId}
        currentAgreement={m2Agreement}
        currentWeek={currentWeek.weekNumber}
        onSuccess={onUpdate}
      />
    </>
  );
}

