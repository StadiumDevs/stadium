import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Github,
  Globe,
  Trophy,
  Loader2,
  CheckCircle,
  FileText,
  Clock,
  Video,
  Share2,
  Users,
  AlertTriangle,
  Upload,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useWalletAuth } from '@/lib/auth/useWalletAuth';
import { Navigation } from "@/components/Navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getCurrentProgramWeek } from "@/lib/projectUtils";
import { calculateTotalPaidUSD, formatPaymentAmount, getTotalByCurrency } from "@/lib/paymentUtils";
import { FinalSubmissionModal, SubmissionData } from "@/components/FinalSubmissionModal";
import { UpdateTeamModal, TeamMember } from "@/components/UpdateTeamModal";
import { M2AgreementSection } from "@/components/M2AgreementSection";
import { ShareProjectModal } from "@/components/ShareProjectModal";
import { WalletConnectionBanner } from "@/components/WalletConnectionBanner";
import { TeamPaymentSection } from "@/components/TeamPaymentSection";
import { M2SubmissionTimeline } from "@/components/M2SubmissionTimeline";
import { ProjectContinuationModal } from "@/components/project/ProjectContinuationModal";
import { SubmitM2DeliverablesModal } from "@/components/SubmitM2DeliverablesModal";
import { ProjectUpdatesTab } from "@/components/project/ProjectUpdatesTab";
import { FundingSignalBadge } from "@/components/project/FundingSignalBadge";
import { EditFundingSignalModal } from "@/components/project/EditFundingSignalModal";
import { ProjectProgramsSection } from "@/components/project/ProjectProgramsSection";
import { NotificationsCard } from "@/components/project/NotificationsCard";
import type { ApiFundingSignal } from "@/lib/api";
import { EditProjectDetailsModal } from "@/components/EditProjectDetailsModal";
import { isAdmin as checkIsAdmin } from "@/lib/constants";
import { addressInList } from "@/lib/addressUtils";
import { Edit } from "lucide-react";

/** Normalize URL for server (must start with www or http(s)://) */
function ensureSubmissionUrl(url: string): string {
  const s = (url || "").trim();
  if (!s) return s;
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("www")) return s;
  return s.includes("://") ? s : `https://${s}`;
}

/** Renders summary text with bullet lines as a proper list */
function SummaryWithBullets({ text }: { text: string }) {
  const bulletPattern = /^[-•*·]\s+/;
  const lines = text.split("\n");
  return (
    <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <li key={i} className="list-none h-2" aria-hidden="true" />;
        const isBullet = bulletPattern.test(trimmed);
        const content = isBullet ? trimmed.replace(bulletPattern, "").trim() : trimmed;
        return (
          <li key={i} className={isBullet ? "" : "list-none"}>
            {content}
          </li>
        );
      })}
    </ul>
  );
}

const ProjectDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  type ApiTeamMember = {
    name: string;
    customUrl?: string;
    walletAddress?: string;
    walletChain?: 'substrate' | 'ethereum' | 'solana';
    role?: string;
    twitter?: string;
    github?: string;
    linkedin?: string;
  };
  type ApiMilestone = string | { description?: string };
  type ApiBounty = { name: string; amount: number; hackathonWonAtId: string };
  type ApiProject = {
    id: string;
    projectName: string;
    description: string;
    teamLead?: string; // legacy
    teamMembers?: ApiTeamMember[];
    projectRepo?: string;
    demoUrl?: string;
    slidesUrl?: string;
    liveUrl?: string;
    techStack?: string | string[];
    categories?: string[];
    milestones?: ApiMilestone[];
    bountyPrize?: ApiBounty[];
    donationAddress?: string;
    donationChain?: 'substrate' | 'ethereum' | 'solana';
    winner?: string; // legacy
    hackathon?: { id: string; name: string; endDate: string; eventStartedAt?: string };
    program?: { id: string; name: string; slug: string } | null;
    eventStartedAt?: string; // legacy - use hackathon.eventStartedAt instead
    m2Status?: 'building' | 'under_review' | 'completed';
    finalSubmission?: {
      repoUrl: string;
      demoUrl: string;
      docsUrl: string;
      summary?: string;
      submittedDate: string;
    };
    completionDate?: string;
    m2Agreement?: {
      mentorName: string;
      agreedDate: string;
      agreedFeatures: string[];
      documentation?: string[];
      successCriteria?: string;
    };
    changesRequested?: {
      feedback: string;
      requestedBy: string;
      requestedDate: string;
    };
    totalPaid?: Array<{
      milestone: 'M1' | 'M2';
      amount: number;
      currency: 'USDC' | 'DOT';
      transactionProof: string;
    }>;
  };

  const [project, setProject] = useState<ApiProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const auth = useWalletAuth();
  const connectedAddress = auth.account?.address ?? null;
  const [editMode, setEditMode] = useState<false | 'updateAddress' | 'edit'>(false);
  const [editFields, setEditFields] = useState<Partial<ApiProject>>({});
  const ALLOWED_CATEGORIES = [
    "Gaming",
    "DeFi",
    "NFT",
    "Developer Tools",
    "Social",
    "Other",
  ];
  // Add state for modal and form fields
  const [deliverableModalOpen, setDeliverableModalOpen] = useState(false);
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneDesc, setMilestoneDesc] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>([""]);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [finalSubmissionModalOpen, setFinalSubmissionModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isSubmitM2ModalOpen, setIsSubmitM2ModalOpen] = useState(false);
  const [isContinuationModalOpen, setIsContinuationModalOpen] = useState(false);
  const [isEditProjectDetailsOpen, setIsEditProjectDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  // Phase 1 revamp (#42): funding signal
  const [fundingSignal, setFundingSignal] = useState<ApiFundingSignal | null>(null);
  const [fundingModalOpen, setFundingModalOpen] = useState(false);

  // Format date utility
  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return '';
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return typeof dateString === 'string' ? dateString : '';
    }
  };

  // Extract YouTube video ID from URL
  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    
    return null;
  };

  // Get tech icon emoji
  const getTechIcon = (tech: string) => {
    const techLower = tech.toLowerCase();
    
    // Common blockchain/web3 tech
    if (techLower.includes('substrate')) return '⛓️';
    if (techLower.includes('polkadot')) return '🔴';
    if (techLower.includes('kusama')) return '🐦';
    if (techLower.includes('solidity')) return '💎';
    if (techLower.includes('rust')) return '🦀';
    if (techLower.includes('ink')) return '🖋️';
    
    // Frontend
    if (techLower.includes('react')) return '⚛️';
    if (techLower.includes('vue')) return '💚';
    if (techLower.includes('next')) return '▲';
    if (techLower.includes('typescript')) return '📘';
    if (techLower.includes('javascript')) return '📜';
    
    // Other
    if (techLower.includes('ipfs')) return '📦';
    if (techLower.includes('node')) return '🟢';
    if (techLower.includes('python')) return '🐍';
    if (techLower.includes('docker')) return '🐳';
    if (techLower.includes('webassembly') || techLower.includes('wasm')) return '🔷';
    if (techLower.includes('web3')) return '🌐';
    if (techLower.includes('xcm')) return '🔗';
    
    // Default
    return '🔧';
  };

  // Generate video embed component
  const getVideoEmbed = (url: string) => {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = extractYoutubeId(url);
      if (videoId) {
        return (
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="Demo video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }
    
    // Loom
    if (url.includes('loom.com')) {
      const loomId = url.split('/').pop()?.split('?')[0];
      if (loomId) {
        return (
          <iframe
            className="w-full h-full"
            src={`https://www.loom.com/embed/${loomId}`}
            title="Demo video"
            allowFullScreen
          />
        );
      }
    }
    
    // Fallback: just show link
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground mb-4">
            Video preview not available
          </p>
          <Button asChild variant="outline">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
              Watch Demo
            </a>
          </Button>
        </div>
      </div>
    );
  };

  // Talisman Connect
  // const { selectedAccount, connect, disconnect, accounts } = useWallets(); // Removed

  // useEffect(() => {
  //   if (selectedAccount) {
  //     setConnectedAddress(selectedAccount.address);
  //   } else {
  //     setConnectedAddress(null);
  //   }
  // }, [selectedAccount]); // Removed

  // Function to fetch/refetch project data
  const fetchProject = async () => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const response = await api.getProject(id);
      const projectData = response?.data || response; // support both {status,data} and raw
      if (projectData) {
        setProject(projectData);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err?.message || "Failed to load project details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
    // Adding `fetchProject` to deps would cause a fetch loop — it's redefined
    // on every render. The effect is intentionally keyed on the route param.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Phase 1 revamp (#42): fetch the funding signal alongside the project.
  useEffect(() => {
    if (!id) return;
    let active = true;
    api
      .getFundingSignal(id)
      .then((r) => {
        if (active) setFundingSignal(r.data);
      })
      .catch(() => {
        // Funding signal is a progressive enhancement; don't break the page on failure.
      });
    return () => {
      active = false;
    };
  }, [id]);

  // Start editing
  const startEdit = () => {
    setEditFields({
      projectName: project.projectName,
      description: project.description,
      teamLead: project.teamLead,
      projectRepo: project.projectRepo,
      demoUrl: project.demoUrl,
      slidesUrl: project.slidesUrl,
      techStack: project.techStack,
      categories: project.categories || [],
      milestones: project.milestones ? [...project.milestones] : [],
    });
    setEditMode('edit');
  };

  // Save edits (persist categories; update UI on success only)
  const saveEdit = async () => {
    try {
      if (project && Array.isArray(editFields.categories)) {
        // Sign in and persist categories via PATCH (protected route)
        const authHeader = await auth.signAction('update-project', {
          projectTitle: project.projectName,
          projectId: project.id,
        });
        await api.updateProjectCategories(project.id, editFields.categories as string[], authHeader);
      }

      // Update local UI after successful server update
      setProject((prev: ApiProject | null) => (prev ? { ...prev, ...editFields } as ApiProject : prev));
      setEditMode(false);
      toast({ title: 'Project updated', description: 'Changes have been saved.' });
    } catch (e) {
      const err = e as Error;
      toast({ title: 'Save failed', description: err?.message || String(e), variant: 'destructive' });
    }
  };

  // Wallet connect logic
  const connectWallet = async () => {
    try {
      const found = await auth.connect();
      if (!found.length) {
        toast({ title: 'No wallet found', description: 'Please install a wallet extension for the selected chain.' });
        return;
      }
      // Prefer an admin account if present, otherwise use the first account.
      const adminAccount = found.find(a => checkIsAdmin(a.address, a.chain));
      auth.selectAccount(adminAccount || found[0]);
    } catch (e) {
      toast({ title: 'Connection failed', description: (e as Error)?.message || 'Could not connect wallet.' });
    }
  };

  // Helper variables for M2 submission
  const connectedWallet = connectedAddress;

  // Add handler for adding/removing deliverables
  const addDeliverable = () => setDeliverables([...deliverables, ""]);
  const removeDeliverable = (idx: number) => setDeliverables(deliverables.filter((_, i) => i !== idx));
  const updateDeliverable = (idx: number, value: string) => setDeliverables(deliverables.map((d, i) => i === idx ? value : d));

  // Check if connected wallet is a team member
  const isTeamMember = useMemo(() => {
    if (!auth.account || !project?.teamMembers) return false;
    return addressInList(auth.account.address, project.teamMembers, auth.account.chain);
  }, [auth.account, project?.teamMembers]);

  // Check if connected wallet is an admin (use shared constants)
  const isAdmin = useMemo(() => {
    return checkIsAdmin(auth.account?.address, auth.account?.chain);
  }, [auth.account]);

  // Check if user can edit (admin or team member)
  const canEdit = isAdmin || isTeamMember;

  // Check if it's Week 5+ (submission allowed)
  const isSubmissionWeek = useMemo(() => {
    const currentWeekData = getCurrentProgramWeek();
    return currentWeekData.weekNumber >= 5;
  }, []);

  // Handle team update (from UpdateTeamModal)
  const handleTeamUpdate = async (data: { members: TeamMember[]; payoutAddress: string }) => {
    if (!project || !connectedAddress) {
      toast({
        title: "Error",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Sign in with the connected wallet
      const authHeader = await auth.signAction('update-team', {
        projectTitle: project.projectName,
        projectId: project.id,
      });

      // Update team - convert to new API format
      await api.updateTeam(project.id, {
        teamMembers: data.members.map(m => ({
          name: m.name.trim(),
          walletAddress: m.wallet?.trim() || undefined,
          role: m.role?.trim() || undefined,
          twitter: m.twitter?.trim() || undefined,
          github: m.github?.trim() || undefined,
          linkedin: m.linkedin?.trim() || undefined,
        })),
        donationAddress: data.payoutAddress.trim(),
      }, authHeader);
      
      // Update local project state
      setProject((prev: ApiProject | null) => (prev ? {
        ...prev,
        teamMembers: data.members.map(m => ({
          name: m.name.trim(),
          walletAddress: m.wallet?.trim() || undefined,
          role: m.role?.trim() || undefined,
          twitter: m.twitter?.trim() || undefined,
          github: m.github?.trim() || undefined,
          linkedin: m.linkedin?.trim() || undefined,
        })),
        donationAddress: data.payoutAddress.trim(),
      } as ApiProject : prev));
      
      toast({
        title: "Success!",
        description: "Team updated successfully.",
      });
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update team. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Handle project details update
  const handleProjectDetailsUpdate = async (data: {
    projectName: string;
    description: string;
    projectRepo?: string;
    demoUrl?: string;
    slidesUrl?: string;
    liveUrl?: string;
    categories: string[];
    techStack: string[];
    finalSubmission?: {
      repoUrl?: string;
      demoUrl?: string;
      docsUrl?: string;
      summary?: string;
    };
    hackathon?: {
      id?: string;
      name?: string;
      endDate?: string;
    };
    bountyPrize?: Array<{
      name: string;
      amount: number;
      hackathonWonAtId: string;
    }>;
  }) => {
    if (!project || !connectedAddress) {
      toast({
        title: "Error",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Sign in with the connected wallet
      const authHeader = await auth.signAction('update-project', {
        projectTitle: project.projectName,
        projectId: project.id,
      });

      // Update project details
      await api.updateProjectDetails(project.id, data, authHeader);

      // Update local project state
      setProject((prev: ApiProject | null) => (prev ? {
        ...prev,
        projectName: data.projectName,
        description: data.description,
        projectRepo: data.projectRepo,
        demoUrl: data.demoUrl,
        slidesUrl: data.slidesUrl,
        liveUrl: data.liveUrl,
        categories: data.categories,
        techStack: data.techStack,
        ...(data.finalSubmission !== undefined ? { finalSubmission: data.finalSubmission } : {}),
        ...(data.hackathon !== undefined
          ? {
              hackathon: {
                ...prev.hackathon,
                // drop undefined sub-fields so a partial edit doesn't blank
                // already-set hackathon values in local state before reload
                ...Object.fromEntries(
                  Object.entries(data.hackathon).filter(([, v]) => v !== undefined),
                ),
              },
            }
          : {}),
        ...(data.bountyPrize !== undefined ? { bountyPrize: data.bountyPrize } : {}),
      } as ApiProject : prev));
      
      toast({
        title: "Success!",
        description: "Project details updated successfully.",
      });
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update project. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Handle inline team & payment save
  const handleTeamPaymentSave = async (data: {
    teamMembers: Array<{
      name: string;
      walletAddress?: string;
      walletChain?: 'substrate' | 'ethereum' | 'solana';
      role?: string;
      twitter?: string;
      github?: string;
      linkedin?: string;
      customUrl?: string;
    }>;
    donationAddress: string;
    donationChain?: 'substrate' | 'ethereum' | 'solana';
  }) => {
    if (!project || !connectedAddress) {
      toast({
        title: "Error",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Sign in with the connected wallet
      const authHeader = await auth.signAction('update-team', {
        projectTitle: project.projectName,
        projectId: project.id,
      });

      // Update team and payout address via API
      await api.updateTeam(project.id, {
        teamMembers: data.teamMembers.map(m => ({
          name: m.name,
          walletAddress: m.walletAddress || undefined,
          walletChain: m.walletChain || 'substrate',
          role: m.role || undefined,
          twitter: m.twitter || undefined,
          github: m.github || undefined,
          linkedin: m.linkedin || undefined,
          customUrl: m.customUrl || undefined,
        })),
        donationAddress: data.donationAddress,
        donationChain: data.donationChain || 'substrate',
      }, authHeader);

      // Update local project state
      setProject((prev: ApiProject | null) => (prev ? {
        ...prev,
        teamMembers: data.teamMembers.map(m => ({
          name: m.name.trim(),
          walletAddress: m.walletAddress?.trim() || undefined,
          walletChain: m.walletChain || 'substrate',
          role: m.role?.trim() || undefined,
          twitter: m.twitter?.trim() || undefined,
          github: m.github?.trim() || undefined,
          linkedin: m.linkedin?.trim() || undefined,
          customUrl: m.customUrl?.trim() || undefined,
        })),
        donationAddress: data.donationAddress.trim(),
        donationChain: data.donationChain || 'substrate',
      } as ApiProject : prev));
      
      // Toast is shown by TeamPaymentSection
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to save changes. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Handle final M2 submission
  const handleM2Submit = async (data: SubmissionData) => {
    if (!project || !connectedAddress) {
      toast({
        title: "Error",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Sign in with the connected wallet
      const authHeader = await auth.signAction('submit-deliverable', {
        projectTitle: project.projectName,
        projectId: project.id,
      });

      await api.submitForReview(project.id, {
        repoUrl: ensureSubmissionUrl(data.repoUrl),
        demoUrl: ensureSubmissionUrl(data.demoUrl),
        docsUrl: ensureSubmissionUrl(data.docsUrl),
        summary: (data.summary || "").trim(),
      }, authHeader);

      // Refresh project data
      const response = await api.getProject(project.id);
      const projectData = response?.data || response;
      if (projectData) {
        setProject(projectData);
      }
      
      toast({
        title: "Success!",
        description: "Your M2 submission has been submitted for review.",
      });
    } catch (err) {
      const error = err as Error;
      toast({
        title: "Submission Failed",
        description: error?.message || "Failed to submit M2 deliverables. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleSubmitM2 = async (data: {
    repoUrl: string;
    demoUrl: string;
    docsUrl: string;
    summary: string;
  }) => {
    if (!project || !connectedAddress) {
      toast({
        title: 'Error',
        description: 'Please connect your wallet first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const authHeader = await auth.signAction('submit-deliverable', {
        projectTitle: project.projectName,
        projectId: project.id,
      });

      await api.submitForReview(
        project.id,
        {
          repoUrl: ensureSubmissionUrl(data.repoUrl),
          demoUrl: ensureSubmissionUrl(data.demoUrl),
          docsUrl: ensureSubmissionUrl(data.docsUrl),
          summary: data.summary.trim(),
        },
        authHeader
      );

      toast({
        title: 'Success!',
        description: '🎉 M2 deliverables submitted! WebZero will review within 2-3 days.',
      });

      await fetchProject();
    } catch (err) {
      const error = err as Error;
      toast({
        title: 'Submission Failed',
        description: error?.message || 'Failed to submit deliverables. Please try again.',
        variant: 'destructive',
      });
      throw err;
    }
  };

  // Handler for form submit
  const handleDeliverableSubmit = async () => {
    setFormError("");
    setFormLoading(true);
    try {
      // Require a connected wallet that is a team member or admin
      // (the server also enforces this when the signed action is sent).
      if (!auth.account) throw new Error("No wallet found");
      const isTeamMemberForSubmit = Array.isArray(project.teamMembers) &&
        addressInList(auth.account.address, project.teamMembers, auth.account.chain);
      const isAdminForSubmit = checkIsAdmin(auth.account.address, auth.account.chain);
      if (!isTeamMemberForSubmit && !isAdminForSubmit) {
        setFormError("You must sign in with a team member or admin wallet to submit deliverables.");
        setFormLoading(false);
        return;
      }
      await auth.signAction('submit-deliverable', {
        projectTitle: project.projectName,
        projectId: project.id,
      });
      // Mock API call to save milestone
      const newMilestone = `${milestoneName}: ${milestoneDesc}\n${deliverables.map((d, i) => `- ${d}`).join("\n")}`;
      setProject((prev: ApiProject | null) => (
        prev ? { ...prev, milestones: [ ...(prev.milestones || []), newMilestone ] } as ApiProject : prev
      ));
      setDeliverableModalOpen(false);
      setMilestoneName("");
      setMilestoneDesc("");
      setDeliverables([""]);
    } catch (err: unknown) {
      setFormError((err as Error)?.message || String(err));
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen scanlines">
        <Navigation />
        <div className="container py-8 flex items-center justify-center min-h-[400px]">
          <div className="panel p-8 inline-flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-label-mid" />
            <span className="label-hw text-display">·LOADING PROJECT</span>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="min-h-screen scanlines">
        <Navigation />
        <div className="container py-8 flex items-center justify-center min-h-[400px]">
          <div className="panel p-8 max-w-md w-full text-center">
            <div className="label-hw-dim mb-3">·SIGNAL LOST</div>
            <h1 className="font-display text-5xl uppercase tracking-tight text-display mb-3">
              Not Found
            </h1>
            <p className="text-body mb-4">
              The project you're looking for doesn't exist or has been removed.
            </p>
            <Link
              to="/"
              className="inline-block font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
            >
              ◂ BACK TO DIRECTORY
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 1. Remove Clipboard button (copy address)
  // 2. Move 'Team Name(s)' to a new line after description
  // 3. Remove 'Verify Team Address (SIWS)' section from the top card
  // 4. Remove timeline graphic from outside the cards
  // 5. Remove Connect Wallet and Claim Payout buttons
  // 6. In the lower card, right below the timeline, render the donationAddress and a small 'Update Team Address' button

  return (
    <div className="min-h-screen scanlines">
      {/* Navigation Header */}
      <Navigation />
      {/* Main Content */}
      <main className="flex-1">
        <div className="container py-8 px-4 sm:px-6">
          {/* Back Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => navigate('/m2-program')}
              className="label-hw-dim hover:text-display transition-colors duration-150 inline-flex items-center gap-1"
            >
              ◂ BACK TO PROGRAM OVERVIEW
            </button>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Section — rack chrome */}
            <div className="space-y-4">
              <div className="label-hw-dim">·ENTRY / {project.id?.toUpperCase()}</div>

              <div className="flex flex-wrap items-center gap-2">
                {project.m2Status === 'completed' && (
                  <span className="bg-display text-shell px-2 py-[2px] font-mono text-[10px] font-bold tracking-[0.12em]">
                    M2 GRADUATE
                  </span>
                )}
                {(project.winner || (Array.isArray(project.bountyPrize) && project.bountyPrize.length > 0)) && (
                  <span className="border border-display text-display px-2 py-[1px] font-mono text-[10px] font-bold tracking-[0.12em]">
                    WINNER
                  </span>
                )}
                {project.categories && project.categories.length > 0 && (
                  <span className="border border-hairline text-label-mid px-2 py-[1px] font-mono text-[10px] tracking-[0.14em]">
                    {project.categories[0].toUpperCase()}
                  </span>
                )}
              </div>

              <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tight text-display leading-[0.95]">
                {project.projectName}
              </h1>

              <div className="label-hw-dim flex flex-wrap items-center gap-3">
                <span>
                  BY {(Array.isArray(project.teamMembers) && project.teamMembers.length > 0
                    ? project.teamMembers.map((m: ApiTeamMember) => m?.name).filter(Boolean).join(', ')
                    : (project.teamLead || 'Unknown')).toUpperCase()}
                </span>
                <span>·</span>
                <span>
                  {(project.program?.name
                    ?? (project.hackathon?.eventStartedAt === "funkhaus-2024"
                      ? "Symmetry 2024"
                      : project.hackathon?.eventStartedAt === "synergy-hack-2024"
                      ? "Synergy 2025"
                      : project.hackathon?.name || "Event")).toUpperCase()}
                </span>
                {project.teamMembers && project.teamMembers.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{project.teamMembers.length} TEAM MEMBER{project.teamMembers.length !== 1 ? 'S' : ''}</span>
                  </>
                )}
              </div>

              <p className="text-body text-base leading-relaxed">{project.description}</p>

              <div className="flex gap-2 flex-wrap">
                {project.liveUrl && project.liveUrl !== "nan" && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5 inline-flex items-center gap-1.5"
                  >
                    <Globe className="h-3 w-3" /> LIVE SITE
                  </a>
                )}
                {project.projectRepo && project.projectRepo !== "nan" && (
                  <a
                    href={project.projectRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5 inline-flex items-center gap-1.5"
                  >
                    <Github className="h-3 w-3" /> SOURCE
                  </a>
                )}
                {(project.demoUrl && project.demoUrl !== "nan") && (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5 inline-flex items-center gap-1.5"
                  >
                    <Globe className="h-3 w-3" /> DEMO
                  </a>
                )}
                {project.slidesUrl && project.slidesUrl !== "nan" && (
                  <a
                    href={project.slidesUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5 inline-flex items-center gap-1.5"
                  >
                    <FileText className="h-3 w-3" /> SLIDES
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5 inline-flex items-center gap-1.5"
                >
                  <Share2 className="h-3 w-3" /> SHARE
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsEditProjectDetailsOpen(true)}
                    className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5 inline-flex items-center gap-1.5"
                  >
                    <Edit className="h-3 w-3" /> EDIT DETAILS
                  </button>
                )}
              </div>
            </div>

            {/* Tabs Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
                <TabsTrigger value="team">Team & Payments</TabsTrigger>
                <TabsTrigger value="updates">Updates</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Funding signal — Phase 1 revamp (#42) */}
                {(fundingSignal?.isSeeking || (isTeamMember || isAdmin)) && (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <FundingSignalBadge signal={fundingSignal} />
                    {(isTeamMember || isAdmin) && connectedAddress && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFundingModalOpen(true)}
                        className="gap-2"
                      >
                        <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                        {fundingSignal?.isSeeking ? "Edit funding signal" : "Set funding signal"}
                      </Button>
                    )}
                  </div>
                )}

                {/* Notifications card — Phase 2 revamp (#71) */}
                {(isTeamMember || isAdmin) && connectedAddress && (
                  <NotificationsCard connectedAddress={connectedAddress} />
                )}

                {/* Programs section — Phase 1 revamp (#45) */}
                <ProjectProgramsSection projectId={project.id} />

                {/* Final Deliverables */}
                {project.finalSubmission && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Final Deliverables
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {project.liveUrl && project.liveUrl !== "nan" && (
                        <a 
                          href={project.liveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Globe className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                          <div className="flex-1">
                            <div className="text-sm font-medium">Live site</div>
                            <div className="text-xs text-muted-foreground">Visit the project</div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                        </a>
                      )}
                      <a 
                        href={project.finalSubmission.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Github className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">GitHub Repository</div>
                          <div className="text-xs text-muted-foreground">View source code</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      </a>
                      
                      <a 
                        href={project.finalSubmission.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Video className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Demo Video</div>
                          <div className="text-xs text-muted-foreground">Watch the demo</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      </a>
                      
                      <a 
                        href={project.finalSubmission.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">Documentation</div>
                          <div className="text-xs text-muted-foreground">View docs</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      </a>
                      
                      {project.finalSubmission.summary && (
                        <div className="mt-4 p-4 bg-muted/20 rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Summary:</h4>
                          <SummaryWithBullets text={project.finalSubmission.summary} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* No final submission: show placeholder or fallback for completed/under_review */}
                {!project.finalSubmission && (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      {project.m2Status === 'completed' || project.m2Status === 'under_review' ? (
                        <>
                          <h3 className="font-medium mb-2">Deliverables not recorded</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            This project was marked {project.m2Status === 'completed' ? 'completed' : 'under review'} but no final submission (repo, demo, docs) was stored. You can submit or update deliverables below to add them here.
                          </p>
                          {project.liveUrl && project.liveUrl !== "nan" && (
                            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline">
                              <Globe className="h-4 w-4" />
                              <span>Visit live site</span>
                            </a>
                          )}
                        </>
                      ) : (
                        <>
                          <h3 className="font-medium mb-2">No Deliverables Yet</h3>
                          <p className="text-sm text-muted-foreground">
                            Final deliverables will appear here once the team submits them.
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Milestones Tab */}
              <TabsContent value="milestones" className="space-y-6 mt-6">
                {/* Only show for M2 program projects */}
                {(project.m2Status === 'building' || project.m2Status === 'under_review' || project.m2Status === 'completed') ? (
                  <>
                    {/* M2 Submission Timeline */}
                    <M2SubmissionTimeline
                      project={project}
                      isTeamMember={isTeamMember}
                      isAdmin={isAdmin}
                      isConnected={!!connectedAddress}
                      connectedWallet={connectedAddress}
                      onSubmit={() => setIsSubmitM2ModalOpen(true)}
                    />

                    {/* 'What's next, milestone 3?' CTA — only on completed
                        projects, only for team members. Admin-only inboxes
                        list submissions; the form posts a new one each time. */}
                    {project.m2Status === 'completed' && isTeamMember && (
                      <div className="panel p-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="label-hw text-display">·WHAT'S NEXT, MILESTONE 3?</div>
                          <p className="text-body text-sm mt-1">
                            Tell us where the project stands now and what you want next.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsContinuationModalOpen(true)}
                          className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim px-3 py-1.5 flex-shrink-0"
                        >
                          SHARE UPDATE ▸
                        </button>
                      </div>
                    )}

                    {/* M2 Agreement Section - Only for building status */}
                    {project.m2Status === 'building' && (
                      <M2AgreementSection
                        projectId={project.id}
                        m2Agreement={project.m2Agreement}
                        hackathonEndDate={project.hackathon?.endDate}
                        isTeamMember={isTeamMember}
                        onUpdate={fetchProject}
                      />
                    )}

                    {/* Submission Status for building/under_review */}
                    {(project.m2Status === 'building' || project.m2Status === 'under_review') && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Submission Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {project.m2Status === 'under_review' && project.finalSubmission ? (
                            <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
                              <div className="flex items-center gap-3 mb-2">
                                <Clock className="w-5 h-5 text-yellow-500" aria-hidden="true" />
                                <span className="font-medium text-lg">Under Review</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Submitted on {new Date(project.finalSubmission.submittedDate).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {project.changesRequested && (
                                <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
                                  <div className="flex items-center gap-3 mb-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500" aria-hidden="true" />
                                    <span className="font-medium text-lg">Changes Requested</span>
                                  </div>
                                  <div className="bg-muted/30 rounded p-3">
                                    <p className="text-sm whitespace-pre-wrap">{project.changesRequested.feedback}</p>
                                  </div>
                                </div>
                              )}
                              
                              <div className="bg-muted/30 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-500" aria-hidden="true" />
                                  <span className="font-medium">
                                    Status: {project.changesRequested ? 'Resubmission Required' : 'Not yet submitted'}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {project.changesRequested 
                                    ? 'Please address the requested changes and resubmit'
                                    : 'Available for submission starting Week 5'
                                  }
                                </p>
                              </div>
                              
                              {/* Submission button */}
                              {isTeamMember && isSubmissionWeek && (
                                <Button 
                                  className="w-full"
                                  size="lg"
                                  onClick={() => setFinalSubmissionModalOpen(true)}
                                >
                                  <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
                                  {project.changesRequested ? 'Resubmit M2 Deliverables' : 'Submit M2 Deliverables'}
                                </Button>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2">Not in M2 Program</h3>
                      <p className="text-sm text-muted-foreground">
                        This project is not currently enrolled in the M2 Incubator program.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Team & Payments Tab */}
              <TabsContent value="team" className="space-y-6 mt-6">
                {/* Wallet Connection Banner */}
                <WalletConnectionBanner
                  onConnect={connectWallet}
                  isConnected={!!connectedAddress}
                  chain={auth.chain}
                  onChainChange={auth.setChain}
                />

                {/* Team & Payment Section */}
                <TeamPaymentSection
                  teamMembers={project.teamMembers || []}
                  donationAddress={project.donationAddress}
                  donationChain={project.donationChain}
                  totalPaid={project.totalPaid}
                  m2Status={project.m2Status}
                  isTeamMember={isTeamMember}
                  isAdmin={isAdmin}
                  isConnected={!!connectedAddress}
                  onSave={handleTeamPaymentSave}
                />
              </TabsContent>

              {/* Updates Tab — Phase 1 revamp #40 / #41 */}
              <TabsContent value="updates" className="space-y-6 mt-6">
                <ProjectUpdatesTab
                  projectId={project.id}
                  projectTitle={project.projectName}
                  canPost={(isTeamMember || isAdmin) && Boolean(connectedAddress)}
                  connectedAddress={connectedAddress || undefined}
                />
              </TabsContent>
            </Tabs>

          </div>
        </div>
      </main>
      <SiteFooter />
      {/* Modal for deliverable upload */}
      <Dialog open={deliverableModalOpen} onOpenChange={setDeliverableModalOpen}>
        <DialogContent className="w-full max-w-xs sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload or Update Deliverables</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Milestone Name</label>
              <input className="w-full border rounded px-2 py-1" value={milestoneName} onChange={e => setMilestoneName(e.target.value)} placeholder="Enter milestone name" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Milestone Description</label>
              <textarea className="w-full border rounded px-2 py-1" value={milestoneDesc} onChange={e => setMilestoneDesc(e.target.value)} placeholder="Describe the milestone" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">List of Deliverables</label>
              <div className="space-y-2">
                {deliverables.map((d, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input className="flex-1 border rounded px-2 py-1" value={d} onChange={e => updateDeliverable(i, e.target.value)} placeholder={`Deliverable ${i + 1}`} />
                    {deliverables.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => removeDeliverable(i)}><span className="text-lg">&times;</span></Button>
                    )}
                  </div>
                ))}
                <Button size="sm" variant="outline" className="mt-1" onClick={addDeliverable}>Add Deliverable</Button>
              </div>
            </div>
            {formError && <div className="text-red-500 text-sm mt-2">{formError}</div>}
          </div>
          <DialogFooter>
            <Button onClick={handleDeliverableSubmit} disabled={formLoading} className="bg-white text-black hover:bg-gray-200 px-6 py-2 rounded">
              {formLoading ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Final Submission Modal */}
      {project && (
        <FinalSubmissionModal
          open={finalSubmissionModalOpen}
          onOpenChange={setFinalSubmissionModalOpen}
          projectId={project.id}
          projectTitle={project.projectName}
          onSubmit={handleM2Submit}
        />
      )}
      
      {/* Share Project Modal */}
      {project && (
        <ShareProjectModal
          open={showShareModal}
          onOpenChange={setShowShareModal}
          projectTitle={project.projectName}
          projectUrl={`/m2-program/${project.id}`}
        />
      )}
      
      {/* Update Team Modal */}
      {project && (
        <>
          <UpdateTeamModal
            open={teamModalOpen}
            onOpenChange={setTeamModalOpen}
            projectId={project.id}
            initialMembers={(project.teamMembers || []).map(m => ({
              name: m.name,
              wallet: m.walletAddress || '',
              role: m.role,
              twitter: m.twitter,
              github: m.github,
              linkedin: m.linkedin,
            }))}
            initialPayoutAddress={project.donationAddress || ''}
            onSubmit={handleTeamUpdate}
          />
          
          {/* Submit M2 Deliverables Modal */}
          <SubmitM2DeliverablesModal
            open={isSubmitM2ModalOpen}
            onOpenChange={setIsSubmitM2ModalOpen}
            project={project}
            onSubmit={handleSubmitM2}
          />

          {/* 'What's next, milestone 3?' continuation modal */}
          {connectedAddress && (
            <ProjectContinuationModal
              open={isContinuationModalOpen}
              onOpenChange={setIsContinuationModalOpen}
              projectId={project.id}
              projectTitle={project.projectName}
              connectedAddress={connectedAddress}
              onSubmitted={() => { /* no list rendered yet — admin inbox is a follow-up */ }}
            />
          )}

          {/* Edit Project Details Modal */}
          <EditProjectDetailsModal
            open={isEditProjectDetailsOpen}
            onOpenChange={setIsEditProjectDetailsOpen}
            project={{
              id: project.id,
              projectName: project.projectName,
              description: project.description,
              projectRepo: project.projectRepo,
              demoUrl: project.demoUrl,
              slidesUrl: project.slidesUrl,
              liveUrl: project.liveUrl,
              categories: project.categories,
              techStack: Array.isArray(project.techStack) ? project.techStack : [],
              finalSubmission: project.finalSubmission,
              hackathon: project.hackathon,
              bountyPrize: project.bountyPrize,
            }}
            onSave={handleProjectDetailsUpdate}
          />

          {/* Edit Funding Signal Modal — Phase 1 revamp (#42) */}
          {(isTeamMember || isAdmin) && connectedAddress && (
            <EditFundingSignalModal
              open={fundingModalOpen}
              onOpenChange={setFundingModalOpen}
              projectId={project.id}
              projectTitle={project.projectName}
              connectedAddress={connectedAddress}
              current={fundingSignal}
              onSaved={setFundingSignal}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ProjectDetailsPage;
