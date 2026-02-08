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
import { web3Enable, web3Accounts, web3FromSource } from '@polkadot/extension-dapp';
import { SiwsMessage } from '@talismn/siws';
import { generateSiwsStatement } from '@/lib/siwsUtils';
import { Navigation } from "@/components/Navigation";
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
import { SubmitM2DeliverablesModal } from "@/components/SubmitM2DeliverablesModal";
import { EditProjectDetailsModal } from "@/components/EditProjectDetailsModal";
import { isAdmin as checkIsAdmin } from "@/lib/constants";
import { Edit } from "lucide-react";

/** Normalize URL for server (must start with www or http(s)://) */
function ensureSubmissionUrl(url: string): string {
  const s = (url || "").trim();
  if (!s) return s;
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("www")) return s;
  return s.includes("://") ? s : `https://${s}`;
}

const ProjectDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  type ApiTeamMember = { 
    name: string; 
    customUrl?: string; 
    walletAddress?: string;
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
    winner?: string; // legacy
    hackathon?: { id: string; name: string; endDate: string; eventStartedAt?: string };
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
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<false | 'updateAddress' | 'edit'>(false);
  const [editFields, setEditFields] = useState<Partial<ApiProject>>({});
  const [registerAddress, setRegisterAddress] = useState('');
  const [registerSig, setRegisterSig] = useState('');
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
  const [isEditProjectDetailsOpen, setIsEditProjectDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

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
        // Sign SIWS and persist categories via PATCH (protected route)
        await web3Enable('Hackathonia');
        const accounts = await web3Accounts();
        const account = accounts.find(a => a.address === connectedAddress) || accounts[0];
        if (!account) throw new Error('No wallet found');
        const siws = new SiwsMessage({
          domain: window.location.hostname,
          uri: window.location.origin,
          address: account.address,
          nonce: Math.random().toString(36).slice(2),
          statement: generateSiwsStatement({
            action: 'update-project',
            projectTitle: project.projectName,
            projectId: project.id
          }),
        });
        const injector = await web3FromSource(account.meta.source);
        const signed = await siws.sign(injector) as unknown as { signature: string; message?: string };
        const messageStr = typeof signed.message === 'string' && signed.message
          ? signed.message
          : (siws as unknown as { toString: () => string }).toString();
        const authHeader = btoa(JSON.stringify({ message: messageStr, signature: signed.signature, address: account.address }));

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
    await web3Enable('Hackathonia');
    const accounts = await web3Accounts();
    if (accounts.length > 0) {
      setConnectedAddress(accounts[0].address);
    } else {
      toast({ title: 'No wallet found', description: 'Please install Polkadot{.js} extension or Talisman.' });
    }
  };

  const handleRegisterTeamAddress = async () => {
    if (!registerAddress) {
      toast({ title: 'Enter an address to register.' });
      return;
    }
    try {
      const siws = new SiwsMessage({
        domain: window.location.hostname,
        uri: window.location.origin,
        address: registerAddress,
        nonce: Math.random().toString(36).slice(2),
        statement: generateSiwsStatement({
          action: 'register-address'
        })
      });
      const accounts = await web3Accounts();
      const account = accounts.find(a => a.address === registerAddress);
      if (!account) {
        toast({ title: 'Address not found in wallet.' });
        return;
      }
      const injector = await web3FromSource(account.meta.source);
      const signed = await siws.sign(injector);
      setRegisterSig(signed.signature);
      toast({ title: 'Address registered (mock)', description: `Signature: ${signed.signature.slice(0, 16)}...` });
    } catch (err: unknown) {
      toast({ title: 'Signature failed', description: (err as Error)?.message || String(err) });
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
    if (!connectedAddress || !project?.teamMembers) return false;
    
    return project.teamMembers.some(
      (member) => member.walletAddress?.toLowerCase() === connectedAddress.toLowerCase()
    );
  }, [connectedAddress, project?.teamMembers]);

  // Check if connected wallet is an admin (use shared constants)
  const isAdmin = useMemo(() => {
    return checkIsAdmin(connectedAddress);
  }, [connectedAddress]);

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
      // Connect wallet and sign with SIWS
      await web3Enable('Hackathonia');
      const accounts = await web3Accounts();
      const account = accounts.find(a => a.address === connectedAddress) || accounts[0];
      if (!account) throw new Error("No wallet found");
      
      const siws = new SiwsMessage({
        domain: window.location.hostname,
        uri: window.location.origin,
        address: account.address,
        nonce: Math.random().toString(36).slice(2),
        statement: generateSiwsStatement({
          action: 'update-team',
          projectTitle: project.projectName,
          projectId: project.id
        }),
      });
      const injector = await web3FromSource(account.meta.source);
      const signed = await siws.sign(injector) as unknown as { signature: string; message?: string };
      const messageStr = typeof signed.message === 'string' && signed.message
        ? signed.message
        : (siws as unknown as { toString: () => string }).toString();
      const authHeader = btoa(JSON.stringify({ message: messageStr, signature: signed.signature, address: account.address }));

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
      // Connect wallet and sign with SIWS
      await web3Enable('Hackathonia');
      const accounts = await web3Accounts();
      const account = accounts.find(a => a.address === connectedAddress) || accounts[0];
      if (!account) throw new Error("No wallet found");
      
      const siws = new SiwsMessage({
        domain: window.location.hostname,
        uri: window.location.origin,
        address: account.address,
        nonce: Math.random().toString(36).slice(2),
        statement: generateSiwsStatement({
          action: 'update-project',
          projectTitle: project.projectName,
          projectId: project.id
        }),
      });
      const injector = await web3FromSource(account.meta.source);
      const signed = await siws.sign(injector) as unknown as { signature: string; message?: string };
      const messageStr = typeof signed.message === 'string' && signed.message
        ? signed.message
        : (siws as unknown as { toString: () => string }).toString();
      const authHeader = btoa(JSON.stringify({ message: messageStr, signature: signed.signature, address: account.address }));

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
      role?: string;
      twitter?: string;
      github?: string;
      linkedin?: string;
      customUrl?: string;
    }>; 
    donationAddress: string 
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
      // Connect wallet and sign with SIWS
      await web3Enable('Hackathonia');
      const accounts = await web3Accounts();
      const account = accounts.find(a => a.address === connectedAddress) || accounts[0];
      if (!account) throw new Error("No wallet found");
      
      const siws = new SiwsMessage({
        domain: window.location.hostname,
        uri: window.location.origin,
        address: account.address,
        nonce: Math.random().toString(36).slice(2),
        statement: generateSiwsStatement({
          action: 'update-team',
          projectTitle: project.projectName,
          projectId: project.id
        }),
      });
      const injector = await web3FromSource(account.meta.source);
      const signed = await siws.sign(injector) as unknown as { signature: string; message?: string };
      const messageStr = typeof signed.message === 'string' && signed.message
        ? signed.message
        : (siws as unknown as { toString: () => string }).toString();
      const authHeader = btoa(JSON.stringify({ message: messageStr, signature: signed.signature, address: account.address }));

      // Update team and payout address via API
      await api.updateTeam(project.id, {
        teamMembers: data.teamMembers.map(m => ({
          name: m.name,
          walletAddress: m.walletAddress || undefined,
          role: m.role || undefined,
          twitter: m.twitter || undefined,
          github: m.github || undefined,
          linkedin: m.linkedin || undefined,
          customUrl: m.customUrl || undefined,
        })),
        donationAddress: data.donationAddress,
      }, authHeader);
      
      // Update local project state
      setProject((prev: ApiProject | null) => (prev ? {
        ...prev,
        teamMembers: data.teamMembers.map(m => ({
          name: m.name.trim(),
          walletAddress: m.walletAddress?.trim() || undefined,
          role: m.role?.trim() || undefined,
          twitter: m.twitter?.trim() || undefined,
          github: m.github?.trim() || undefined,
          linkedin: m.linkedin?.trim() || undefined,
          customUrl: m.customUrl?.trim() || undefined,
        })),
        donationAddress: data.donationAddress.trim(),
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
      // Connect wallet and sign with SIWS
      await web3Enable('Hackathonia');
      const accounts = await web3Accounts();
      const account = accounts.find(a => a.address === connectedAddress) || accounts[0];
      if (!account) throw new Error("No wallet found");
      
      const siws = new SiwsMessage({
        domain: window.location.hostname,
        uri: window.location.origin,
        address: account.address,
        nonce: Math.random().toString(36).slice(2),
        statement: generateSiwsStatement({
          action: 'submit-deliverable',
          projectTitle: project.projectName,
          projectId: project.id
        }),
      });
      const injector = await web3FromSource(account.meta.source);
      const signed = await siws.sign(injector) as unknown as { signature: string; message?: string };
      const messageStr = typeof signed.message === 'string' && signed.message
        ? signed.message
        : (siws as unknown as { toString: () => string }).toString();
      const authHeader = btoa(JSON.stringify({ message: messageStr, signature: signed.signature, address: account.address }));

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
      await web3Enable('Hackathonia');
      const accounts = await web3Accounts();
      const account = accounts.find((a) => a.address === connectedAddress) || accounts[0];
      if (!account) throw new Error('No wallet found');

      const siws = new SiwsMessage({
        domain: window.location.hostname,
        uri: window.location.origin,
        address: account.address,
        nonce: Math.random().toString(36).slice(2),
        statement: generateSiwsStatement({
          action: 'submit-deliverable',
          projectTitle: project.projectName,
          projectId: project.id,
        }),
      });
      const injector = await web3FromSource(account.meta.source);
      if (!injector?.signer?.signRaw) throw new Error('Wallet does not support signing');
      const signed = await siws.sign(injector) as unknown as { signature: string; message?: string };
      const messageStr =
        typeof signed.message === 'string' && signed.message
          ? signed.message
          : (siws as unknown as { toString: () => string }).toString();
      const authHeader = btoa(
        JSON.stringify({ message: messageStr, signature: signed.signature, address: account.address })
      );

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
      // Connect wallet and sign with SIWS
      await web3Enable('Hackathonia');
      const accounts = await web3Accounts();
      const account = accounts[0];
      if (!account) throw new Error("No wallet found");
      // New schema: require signer to be a team member (server also enforces via SIWS)
      const isTeamMember = Array.isArray(project.teamMembers) && project.teamMembers.some(
        (m: ApiTeamMember) => (m.walletAddress || '').toLowerCase() === account.address.toLowerCase()
      );
      if (!isTeamMember) {
        setFormError("You must sign in with a team member wallet to submit deliverables (or use an admin wallet).");
        setFormLoading(false);
        return;
      }
      const siws = new SiwsMessage({
        domain: window.location.hostname,
        uri: window.location.origin,
        address: account.address,
        nonce: Math.random().toString(36).slice(2),
        statement: generateSiwsStatement({
          action: 'submit-deliverable',
          projectTitle: project.projectName,
          projectId: project.id
        })
      });
      const injector = await web3FromSource(account.meta.source);
      await siws.sign(injector);
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
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg">Loading project details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="container py-8">
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold mb-2">Project Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The project you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link to="/" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Go Back Home</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
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
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <Navigation />
      {/* Main Content */}
      <main className="flex-1 pt-16">
        <div className="container py-8 px-4 sm:px-6">
          {/* Back Button */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/m2-program')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to Program Overview
            </Button>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header Section - Always Visible */}
            <div className="space-y-4">
              {/* Status Badges Row */}
              <div className="flex flex-wrap gap-2">
                {project.m2Status === 'completed' && (
                  <Badge className="bg-green-500 text-white">
                    🎓 M2 Graduate
                  </Badge>
                )}
                {(project.winner || (Array.isArray(project.bountyPrize) && project.bountyPrize.length > 0)) && (
                  <Badge className="bg-yellow-500 text-black">
                    🏆 Winner
                  </Badge>
                )}
                {project.categories && project.categories.length > 0 && (
                  <Badge variant="outline" className="bg-primary/10 border-primary">
                    {project.categories[0]}
                  </Badge>
                )}
              </div>
              
              {/* Project Title */}
              <h1 className="font-heading text-3xl sm:text-4xl font-bold">{project.projectName}</h1>
              
              {/* Meta Line */}
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>By {Array.isArray(project.teamMembers) && project.teamMembers.length > 0 
                  ? project.teamMembers.map((m: ApiTeamMember) => m?.name).filter(Boolean).join(', ') 
                  : (project.teamLead || 'Unknown')}</span>
                <span>·</span>
                <span>
                  {project.hackathon?.eventStartedAt === "funkhaus-2024" 
                    ? "Symmetry 2024" 
                    : project.hackathon?.eventStartedAt === "synergy-hack-2024" 
                    ? "Synergy 2025" 
                    : project.hackathon?.name || "Hackathon"}
                </span>
                {project.teamMembers && project.teamMembers.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{project.teamMembers.length} team member{project.teamMembers.length !== 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
              
              {/* Description */}
              <p className="text-muted-foreground">{project.description}</p>
              
              {/* Link Buttons */}
              <div className="flex gap-3 flex-wrap">
                {project.liveUrl && project.liveUrl !== "nan" && (
                  <Button variant="outline" asChild>
                    <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Live site</span>
                    </a>
                  </Button>
                )}
                {project.projectRepo && project.projectRepo !== "nan" && (
                  <Button variant="outline" asChild>
                    <a href={project.projectRepo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <Github className="h-4 w-4" />
                      <span>Source Code</span>
                    </a>
                  </Button>
                )}
                {(project.demoUrl && project.demoUrl !== "nan") && (
                  <Button variant="outline" asChild>
                    <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Live Demo</span>
                    </a>
                  </Button>
                )}
                {project.slidesUrl && project.slidesUrl !== "nan" && (
                  <Button variant="outline" asChild>
                    <a href={project.slidesUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Slides</span>
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowShareModal(true)}
                >
                  <Share2 className="w-4 h-4 mr-2" aria-hidden="true" />
                  Share
                </Button>
                {canEdit && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditProjectDetailsOpen(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" aria-hidden="true" />
                    Edit Details
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs Section */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
                <TabsTrigger value="team">Team & Payments</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-6">
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
                          <p className="text-sm text-muted-foreground">
                            {project.finalSubmission.summary}
                          </p>
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
                />

                {/* Team & Payment Section */}
                <TeamPaymentSection
                  teamMembers={project.teamMembers || []}
                  donationAddress={project.donationAddress}
                  totalPaid={project.totalPaid}
                  m2Status={project.m2Status}
                  isTeamMember={isTeamMember}
                  isAdmin={isAdmin}
                  isConnected={!!connectedAddress}
                  onSave={handleTeamPaymentSave}
                />
              </TabsContent>
            </Tabs>

          </div>
        </div>
      </main>
      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8 mt-16">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
                Created with ❤️ by the cracked devs at{' '}
                <a
                  href="https://www.joinwebzero.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline transition-colors"
                >
                  WebZero
                </a>
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/JoinWebZero/"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <a
                href="https://x.com/JoinWebZero"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                X
              </a>
            </div>
          </div>
        </div>
      </footer>
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
            }}
            onSave={handleProjectDetailsUpdate}
          />
        </>
      )}
    </div>
  );
};

export default ProjectDetailsPage;
