import { useState } from "react";
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
        <div className="panel p-8 mb-6 text-center">
          <FileText className="w-10 h-10 mx-auto mb-4 text-label-dim" />
          <span className="label-hw text-display block mb-2">·NO M2 ROADMAP CREATED YET</span>
          <p className="text-body text-sm mb-5 max-w-md mx-auto">
            Define your 6-week development plan to get started with the M2 Incubator Program.
          </p>
          {isTeamMember && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim px-4 py-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              CREATE YOUR M2 ROADMAP
            </button>
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
      <div className="panel p-6 mb-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5 pb-4 border-b border-hairline-subtle">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-label-mid" />
              <span className="label-hw text-display">·YOUR M2 ROADMAP</span>
              {isPastWeek4 && (
                <span className="inline-flex items-center gap-1 border border-hairline text-label-mid px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase ml-1">
                  <Lock className="w-2.5 h-2.5" />
                  Locked
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 label-hw-dim">
              <Calendar className="w-3 h-3" />
              <span>LAST UPDATED: {lastUpdated.toUpperCase()} · BY {updatedBy.toUpperCase()}</span>
            </div>
          </div>

          {/* Edit Button */}
          {isTeamMember && canEdit && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5 inline-flex items-center gap-1.5 ml-4"
            >
              <Edit className="w-3 h-3" />
              EDIT ROADMAP
            </button>
          )}
        </div>

        {/* Core Features Section */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-3.5 h-3.5 text-led" />
            <span className="label-hw text-display">·CORE FEATURES — MUST COMPLETE</span>
          </div>
          <div className="lcd p-4">
            <ul className="space-y-2">
              {m2Agreement.agreedFeatures.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-display mt-1 flex-shrink-0 font-mono text-xs">·</span>
                  <span className="flex-1 text-sm leading-relaxed whitespace-pre-line text-body">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Documentation Requirements Section */}
        {m2Agreement.documentation && m2Agreement.documentation.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-3.5 h-3.5 text-label-mid" />
              <span className="label-hw text-display">·DOCUMENTATION REQUIREMENTS</span>
            </div>
            <div className="lcd p-4">
              <ul className="space-y-2">
                {m2Agreement.documentation.map((doc, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-label-mid mt-1 flex-shrink-0 font-mono text-xs">·</span>
                    <span className="flex-1 text-sm leading-relaxed whitespace-pre-line text-body">{doc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Success Criteria Section */}
        {m2Agreement.successCriteria && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-3.5 h-3.5 text-label-mid" />
              <span className="label-hw text-display">·SUCCESS CRITERIA</span>
            </div>
            <div className="lcd p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-body">
                {m2Agreement.successCriteria}
              </p>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-5 pt-4 border-t border-hairline-subtle">
          {!isPastWeek4 ? (
            <div className="flex items-start gap-2 label-hw-dim">
              <Lightbulb className="w-3 h-3 mt-0.5 text-label-mid flex-shrink-0" />
              <p>YOUR PLAN, AGREED WITH MENTORS. UPDATE ANYTIME DURING WEEKS 1–4.</p>
            </div>
          ) : (
            <div className="flex items-start gap-2 lcd p-3 border-destructive">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-destructive flex-shrink-0" />
              <p className="label-hw text-destructive">·ROADMAP LOCKED AFTER WEEK 4 — CONTACT YOUR MENTORS IF YOU NEED CHANGES.</p>
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

