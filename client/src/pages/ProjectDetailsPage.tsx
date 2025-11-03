import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Github,
  Globe,
  Trophy,
  Loader2,
  Clipboard,
  CheckCircle,
  FileText,
  Circle,
  Clock,
  Video,
  Share2,
  Twitter,
  Linkedin,
  Calendar,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { FinalSubmissionModal, SubmissionData } from "@/components/FinalSubmissionModal";
import { UpdateTeamModal, TeamMember } from "@/components/UpdateTeamModal";
import { ShareProjectModal } from "@/components/ShareProjectModal";

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
    techStack?: string | string[];
    categories?: string[];
    milestones?: ApiMilestone[];
    bountyPrize?: ApiBounty[];
    donationAddress?: string;
    winner?: string; // legacy
    eventStartedAt?: string;
    m2Status?: 'building' | 'under_review' | 'completed';
    finalSubmission?: {
      repoUrl: string;
      demoUrl: string;
      docsUrl: string;
      summary?: string;
      submittedDate: string;
    };
    completionDate?: string;
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
  const [teamEditing, setTeamEditing] = useState(false);
  const [teamDraft, setTeamDraft] = useState<ApiTeamMember[]>([]);
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

  useEffect(() => {
    const loadProject = async () => {
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
    loadProject();
  }, [id, toast]);

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

  // Team editing helpers
  const startTeamEdit = () => {
    setTeamDraft([...(project?.teamMembers || [])]);
    setTeamEditing(true);
  };
  const addTeamMember = () => setTeamDraft((prev) => [...prev, { name: "" }]);
  const removeTeamMember = (index: number) => setTeamDraft((prev) => prev.filter((_, i) => i !== index));
  const updateTeamMember = (index: number, field: keyof ApiTeamMember, value: string) => {
    setTeamDraft((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  const submitTeamUpdate = async () => {
    if (!project) return;
    try {
      // Build SIWS header from connectedAddress or prompt flow
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

      // Send full replacement of teamMembers
      const sanitized = teamDraft.map(t => ({ name: t.name, walletAddress: t.walletAddress || "", customUrl: t.customUrl || "" }));
      const updated = await api.updateProjectTeam(project.id, sanitized, authHeader);
      const updatedProject = updated?.data || updated;
      setProject(updatedProject);
      setTeamEditing(false);
      toast({ title: 'Team updated', description: 'Team members saved.' });
    } catch (e) {
      toast({ title: 'Update failed', description: (e as Error)?.message || String(e), variant: 'destructive' });
    }
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
          statement: 'Submit milestone deliverables for Hackathonia',
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

  // Demo status booleans (replace with real logic as needed)
  const eventStarted = true;
  const bountyPaid = false;
  const milestoneDelivered = false;

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

  // Check if it's Week 5+ (submission allowed)
  const isSubmissionWeek = useMemo(() => {
    const currentWeekData = getCurrentProgramWeek();
    return currentWeekData.weekNumber >= 5;
  }, []);

  // Handle team update
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

      // Update team
      await api.updateTeam(project.id, data, authHeader);
      
      // Update local project state
      setProject((prev: ApiProject | null) => (prev ? {
        ...prev,
        teamMembers: data.members.map(m => ({
          name: m.name.trim(),
          walletAddress: m.wallet.trim() || undefined,
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

      // Submit for review (API expects simplified format)
      await api.submitForReview(project.id, {
        repoUrl: data.repoUrl,
        demoUrl: data.demoUrl,
        docsUrl: data.docsUrl,
        summary: data.summary,
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
      <main className="flex-1">
        <div className="container mx-auto px-4 py-4">
          {/* Breadcrumb Navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/projects')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Back to M2 Program
          </Button>
        </div>
        <div className="container py-8 px-2 sm:px-4">
          {/* Wallet connection and address */}
          <div className="space-y-4 mb-6">
            {!connectedAddress && (
              <Button 
                variant="default" 
                size="lg"
                onClick={connectWallet}
                className="w-full md:w-auto"
              >
                Connect Wallet
              </Button>
            )}
            {connectedAddress && (
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  Welcome {connectedAddress.slice(0, 10)}...{connectedAddress.slice(-8)}, stay on top of milestone reviews and payouts for your team.
                </span>
                {!editMode && (
                  <Button size="sm" variant="outline" onClick={startEdit}>
                    Update Project Information
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Success Banner for Completed Projects */}
            {project.m2Status === 'completed' && (
              <div className="bg-gradient-to-r from-green-900/20 to-yellow-900/20 border border-green-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500" aria-hidden="true" />
                  <div>
                    <h3 className="font-medium text-green-500">M2 Graduate</h3>
                    <p className="text-sm text-muted-foreground">
                      This team successfully completed the 6-week M2 Accelerator program
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Top Project Card (wider) */}
            <Card className="w-full max-w-full sm:max-w-4xl p-2 sm:p-4">
              <CardHeader className="pb-2 relative">
                {/* Badge in top right */}
                {(project.winner || (Array.isArray(project.bountyPrize) && project.bountyPrize.length > 0)) && (
                  <div className="absolute right-4 top-4 mt-0 sm:mt-4">
                    <Badge
                      className={
                        (project.winner || project.bountyPrize?.[0]?.name || "").toLowerCase().includes("kusama")
                          ? "bg-purple-600/20 text-purple-300 border-purple-600/30"
                          : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                      }
                      variant="secondary"
                    >
                      🏆 {(project.winner || project.bountyPrize?.[0]?.name || "")
                        .split(" ")
                        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                        .join(" ")}
                    </Badge>
                  </div>
                )}
                {/* Add vertical space below the label and before the heading */}
                {(project.winner || (Array.isArray(project.bountyPrize) && project.bountyPrize.length > 0)) && <div className="h-8 sm:h-10" />}
                {/* Project Title */}
                {editMode === 'edit' ? (
                  <input
                    className="w-full border rounded px-2 py-1 text-base mb-2 bg-background text-white"
                    value={String(editFields.projectName || '')}
                    onChange={(e) => setEditFields((prev) => ({ ...prev, projectName: e.target.value }))}
                    placeholder="Project Name"
                  />
                ) : (
                  <CardTitle className="font-heading text-xl sm:text-2xl mb-2">{project.projectName}</CardTitle>
                )}
                
                {/* Project Metadata */}
                <div className="flex flex-wrap gap-4 mb-6 text-sm text-muted-foreground">
                  {/* Hackathon */}
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" aria-hidden="true" />
                    <span>sub0 2025 Hackathon</span>
                  </div>
                  
                  {/* Submitted date */}
                  {project.finalSubmission?.submittedDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" aria-hidden="true" />
                      <span>Submitted {new Date(project.finalSubmission.submittedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                  
                  {/* Team size */}
                  {project.teamMembers && project.teamMembers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" aria-hidden="true" />
                      <span>{project.teamMembers.length} team member{project.teamMembers.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  
                  {/* Track badge */}
                  {project.categories && project.categories.length > 0 && (
                    <Badge variant="outline" className="bg-primary/10 border-primary">
                      {project.categories[0]}
                    </Badge>
                  )}
                  
                  {/* Winner badge */}
                  {(project.winner || (Array.isArray(project.bountyPrize) && project.bountyPrize.length > 0)) && (
                    <Badge className="bg-yellow-500 text-black">
                      🏆 Winner
                    </Badge>
                  )}
                </div>
                {/* Team Name(s) below title */}
                <span className="block text-sm text-white mb-2">
                  Team: {Array.isArray(project.teamMembers) && project.teamMembers.length > 0 ? project.teamMembers.map((m: ApiTeamMember) => m?.name).filter(Boolean).join(', ') : (project.teamLead || '')}
                </span>
                {/* Share Project Button */}
                <div className="flex items-center gap-2 mb-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShareModal(true)}
                  >
                    <Share2 className="w-4 h-4 mr-2" aria-hidden="true" />
                    Share Project
                  </Button>
                </div>
                {editMode === 'edit' ? (
                  <textarea
                    className="w-full border rounded px-2 py-1 text-sm sm:text-base mb-2 bg-background text-white"
                    rows={4}
                    value={String(editFields.description || '')}
                    onChange={(e) => setEditFields((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Project Description"
                  />
                ) : (
                  <p className="text-sm sm:text-base text-muted-foreground mb-2">{project.description}</p>
                )}
                {/* Tech stack badges with icons */}
                {project.techStack && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {Array.isArray(project.techStack) ? (
                      project.techStack.map((tech: string, idx: number) => (
                        <Badge 
                          key={idx}
                          variant="outline"
                          className="bg-primary/5 border-primary/20 text-foreground px-3 py-1"
                        >
                          {getTechIcon(tech)}
                          <span className="ml-2">{tech}</span>
                        </Badge>
                      ))
                    ) : (
                      <Badge 
                        variant="outline"
                        className="bg-primary/5 border-primary/20 text-foreground px-3 py-1"
                      >
                        {getTechIcon(project.techStack)}
                        <span className="ml-2">{project.techStack}</span>
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex gap-3 mt-4 flex-wrap">
                  {project.projectRepo && (
                    <Button variant="outline" asChild>
                      <a href={project.projectRepo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        <Github className="h-4 w-4" />
                        <span>Source Code</span>
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    </Button>
                  )}
                  {(project.demoUrl || project.slidesUrl) && (
                    <Button variant="outline" asChild>
                      <a href={project.demoUrl || project.slidesUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span>Live Demo</span>
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    </Button>
                  )}
                  {project.slidesUrl && (
                    <Button variant="outline" asChild>
                      <a href={project.slidesUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Slides</span>
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
                {editMode === 'edit' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                    <input
                      className="border rounded px-2 py-1 text-xs bg-background text-white"
                      placeholder="Source Code URL"
                      value={String(editFields.projectRepo || '')}
                      onChange={(e) => setEditFields((prev) => ({ ...prev, projectRepo: e.target.value }))}
                    />
                    <input
                      className="border rounded px-2 py-1 text-xs bg-background text-white"
                      placeholder="Live Demo URL"
                      value={String(editFields.demoUrl || '')}
                      onChange={(e) => setEditFields((prev) => ({ ...prev, demoUrl: e.target.value }))}
                    />
                    <input
                      className="border rounded px-2 py-1 text-xs bg-background text-white"
                      placeholder="Slides URL"
                      value={String(editFields.slidesUrl || '')}
                      onChange={(e) => setEditFields((prev) => ({ ...prev, slidesUrl: e.target.value }))}
                    />
                  </div>
                )}
                {editMode === 'edit' && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-heading text-sm font-semibold text-white">Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {ALLOWED_CATEGORIES.map((cat) => {
                        const active = (editFields.categories as string[] | undefined)?.includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            className={`px-2 py-1 text-xs rounded border ${active ? 'bg-primary text-white border-primary' : 'bg-transparent text-white border-white/20'}`}
                            onClick={() => {
                              setEditFields((prev) => {
                                const current = new Set<string>(Array.isArray(prev.categories) ? prev.categories as string[] : []);
                                if (current.has(cat)) current.delete(cat); else current.add(cat);
                                return { ...prev, categories: Array.from(current) };
                              });
                            }}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="default" onClick={saveEdit}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* Demo Section */}
            {project.demoUrl && (
              <div className="glass-panel rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-heading mb-4">🎬 Demo</h2>
                
                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                  {getVideoEmbed(project.demoUrl)}
                </div>
                
                <a 
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  Open in new tab
                </a>
              </div>
            )}

            {/* M2 Program Progress Section */}
            {(project.winner || (Array.isArray(project.bountyPrize) && project.bountyPrize.length > 0) || project.m2Status) && (
              <div className="glass-panel rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-heading mb-4">📊 M2 Program Progress</h2>
                
                {(() => {
                  const currentWeekData = getCurrentProgramWeek();
                  const currentWeek = currentWeekData.weekNumber;
                  const m2Status = project.m2Status || 'building';
                  
                  // Calculate status badge
                  let statusBadge = null;
                  if (m2Status === 'building') {
                    statusBadge = (
                      <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/30">
                        🟢 Building M2
                      </Badge>
                    );
                  } else if (m2Status === 'under_review') {
                    statusBadge = (
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                        ⏳ Under Review
                      </Badge>
                    );
                  } else if (m2Status === 'completed') {
                    statusBadge = (
                      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                        ✅ Completed
                      </Badge>
                    );
                  }
                  
                  return (
                    <>
                      <div className="mb-4">
                        <div className="text-sm text-muted-foreground mb-2">
                          Week {currentWeek} of 6 · {m2Status === 'building' ? 'Building' : m2Status === 'under_review' ? 'Under Review' : 'Completed'}
                        </div>
                        <Progress value={(currentWeek / 6) * 100} className="h-2" />
                      </div>
                      
                      <div className="text-sm mb-4">
                        Status: {statusBadge}
                      </div>
                      
                      <div className="text-sm text-muted-foreground mt-4">
                        Need help? Contact your mentor in Telegram
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Milestone 2 Submission Section */}
            {(project.winner || (Array.isArray(project.bountyPrize) && project.bountyPrize.length > 0) || project.m2Status) && (
              <div className="glass-panel rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-heading mb-4">🚀 Milestone 2 Submission</h2>
                
                {project.finalSubmission ? (
                  <div className="space-y-4">
                    {/* Status header */}
                    <div className="flex items-center gap-2 mb-4">
                      {project.m2Status === 'under_review' && (
                        <>
                          <Clock className="w-5 h-5 text-yellow-500" aria-hidden="true" />
                          <span className="font-medium text-lg">⏳ Under Review</span>
                        </>
                      )}
                      {project.m2Status === 'completed' && (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
                          <span className="font-medium text-lg text-green-500">✅ M2 COMPLETED</span>
                        </>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Submitted: {new Date(project.finalSubmission.submittedDate).toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </div>
                    
                    {/* Deliverables - clickable links */}
                    <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                      <h3 className="font-medium">Deliverables:</h3>
                      
                      <a 
                        href={project.finalSubmission.repoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Github className="w-4 h-4" aria-hidden="true" />
                        GitHub Repository →
                      </a>
                      
                      <a 
                        href={project.finalSubmission.demoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Video className="w-4 h-4" aria-hidden="true" />
                        Demo Video →
                      </a>
                      
                      <a 
                        href={project.finalSubmission.docsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <FileText className="w-4 h-4" aria-hidden="true" />
                        Documentation →
                      </a>
                      
                      {project.finalSubmission.summary && (
                        <div className="pt-2 border-t border-subtle">
                          <p className="text-sm text-muted-foreground">
                            {project.finalSubmission.summary}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Review status for under_review */}
                    {project.m2Status === 'under_review' && (
                      <div className="space-y-2 bg-muted/30 rounded-lg p-4">
                        <h3 className="font-medium mb-3">Review Status:</h3>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                          <span>Mentor Review: Pending</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                          <span>WebZero Review: Pending</span>
                        </div>
                        <p className="text-xs text-muted-foreground pt-2">
                          Contact your mentor in Telegram if you have questions.
                        </p>
                      </div>
                    )}
                    
                    {/* Completion status for completed */}
                    {project.m2Status === 'completed' && (
                      <div className="space-y-4">
                        <div className="space-y-2 bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                          <div className="flex items-center gap-2 text-green-500">
                            <CheckCircle className="w-4 h-4" aria-hidden="true" />
                            <span className="text-sm">Mentor Approved</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-500">
                            <CheckCircle className="w-4 h-4" aria-hidden="true" />
                            <span className="text-sm">WebZero Approved</span>
                          </div>
                        </div>
                        
                        <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
                          <div className="font-medium mb-2">💰 Payment: $4,000 USDC Total Paid</div>
                          <ul className="text-sm space-y-1">
                            <li>• Milestone 1: $2,000 (Nov 17, 2025)</li>
                            <li>• Milestone 2: $2,000 ({project.completionDate ? new Date(project.completionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Processing'})</li>
                          </ul>
                        </div>
                        
                        <div className="text-center pt-4 text-lg">
                          🎉 Congratulations on completing the M2 program!
                        </div>
                      </div>
                    )}
                  </div>
                ) : !project.finalSubmission && project.m2Status !== 'under_review' && project.m2Status !== 'completed' ? (
                  <div className="space-y-4">
                    <div className="text-muted-foreground">
                      Status: Not yet submitted<br />
                      Available: Week 5+ (Dec 23)
                    </div>
                    <p className="text-sm mb-4">
                      When ready, submit your final M2 deliverables here.
                    </p>
                    
                    {!connectedAddress ? (
                      <p className="text-sm text-muted-foreground">
                        Connect your wallet with a team member address to submit.
                      </p>
                    ) : !isTeamMember ? (
                      <p className="text-sm text-yellow-500">
                        Only team members can submit M2 deliverables.
                      </p>
                    ) : !isSubmissionWeek ? (
                      <Button disabled variant="outline">
                        Available Week 5+ (Dec 23)
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setFinalSubmissionModalOpen(true)}
                        variant="default"
                      >
                        Upload or update deliverables
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* Timeline and Milestone Card (normal width, below) */}
            <Card className="w-full max-w-full sm:max-w-4xl p-2 sm:p-4 relative">
              {/* Timeline graphic at the top */}
              <div className="flex items-center justify-center gap-8 mb-6 mt-2 px-4">
                {/* Event Start */}
                <div className="flex flex-col items-center">
                  <button className={`rounded-full p-2 ${eventStarted ? 'bg-white text-black' : 'bg-muted text-muted-foreground'}`}> <CheckCircle className="h-6 w-6" /> </button>
                  <span className="text-xs mt-2">{project.eventStartedAt || 'Event Start'}</span>
                </div>
                <div className="h-1 w-12 bg-muted rounded" />
                {/* Bounty Payout */}
                <div className="flex flex-col items-center">
                  <button className="rounded-full p-2 bg-yellow-400 text-black border-2 border-yellow-500 shadow"> <CheckCircle className="h-6 w-6" /> </button>
                  <span className="text-xs mt-2 text-yellow-600 font-semibold">Bounty Payout</span>
                </div>
                <div className="h-1 w-12 bg-muted rounded" />
                {/* Milestone Delivered */}
                <div className="flex flex-col items-center">
                  <button className={`rounded-full p-2 ${milestoneDelivered ? 'bg-white text-black' : 'bg-muted text-muted-foreground'}`}> <CheckCircle className="h-6 w-6" /> </button>
                  <span className="text-xs mt-2">Milestone Delivered</span>
                </div>
              </div>
              {/* Team Members section */}
              <div className="glass-panel rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-heading">👥 Team</h2>
                  {isTeamMember && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setTeamModalOpen(true)}
                    >
                      Edit Team
                    </Button>
                  )}
                </div>
                
                {!teamEditing ? (
                  <>
                    {(project.teamMembers || []).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(project.teamMembers || []).map((member, index) => (
                          <div 
                            key={index}
                            className="border border-subtle rounded-lg p-4 bg-muted/30"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium text-lg mb-1">{member.name}</h3>
                                <p className="text-xs text-muted-foreground font-mono mb-3">
                                  {member.walletAddress ? 
                                    `${member.walletAddress.slice(0, 6)}...${member.walletAddress.slice(-4)}` : 
                                    'No wallet connected'
                                  }
                                </p>
                                
                                {/* Optional social links */}
                                {(member.twitter || member.github || member.linkedin) && (
                                  <div className="flex gap-2">
                                    {member.twitter && (
                                      <a 
                                        href={`https://twitter.com/${member.twitter.replace('@', '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-primary transition-colors"
                                        aria-label={`${member.name}'s Twitter`}
                                      >
                                        <Twitter className="w-4 h-4" aria-hidden="true" />
                                      </a>
                                    )}
                                    {member.github && (
                                      <a 
                                        href={`https://github.com/${member.github}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-primary transition-colors"
                                        aria-label={`${member.name}'s GitHub`}
                                      >
                                        <Github className="w-4 h-4" aria-hidden="true" />
                                      </a>
                                    )}
                                    {member.linkedin && (
                                      <a 
                                        href={member.linkedin.startsWith('http') ? member.linkedin : `https://linkedin.com/in/${member.linkedin}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-primary transition-colors"
                                        aria-label={`${member.name}'s LinkedIn`}
                                      >
                                        <Linkedin className="w-4 h-4" aria-hidden="true" />
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Optional role badge */}
                              {member.role && (
                                <Badge variant="secondary" className="text-xs ml-2">
                                  {member.role}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No team members listed</p>
                    )}
                    
                    {/* Payout address - shown only to team members */}
                    {isTeamMember && project.donationAddress && (
                      <div className="mt-4 pt-4 border-t border-subtle">
                        <p className="text-sm text-muted-foreground mb-1">Payout Address:</p>
                        <p className="text-sm font-mono">{project.donationAddress}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-2">
                    {teamDraft.map((m, i) => (
                      <div key={i} className="flex flex-col sm:flex-row gap-2">
                        <input className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Name" value={m.name} onChange={e => updateTeamMember(i, 'name', e.target.value)} />
                        <input className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Wallet Address (optional)" value={m.walletAddress || ''} onChange={e => updateTeamMember(i, 'walletAddress', e.target.value)} />
                        <input className="flex-1 border rounded px-2 py-1 text-xs" placeholder="Custom URL (optional)" value={m.customUrl || ''} onChange={e => updateTeamMember(i, 'customUrl', e.target.value)} />
                        <Button size="icon" variant="ghost" onClick={() => removeTeamMember(i)}><span className="text-lg">&times;</span></Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={addTeamMember}>Add Member</Button>
                      <Button size="sm" variant="default" onClick={submitTeamUpdate}>Save Team</Button>
                      <Button size="sm" variant="ghost" onClick={() => setTeamEditing(false)}>Cancel</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Note: Saving will replace the entire team list.</p>
                  </div>
                )}
              </div>
              {/* Create Team Multisig section */}
              <div className="mb-6">
                <h4 className="font-heading font-semibold text-base mb-2 text-white">Create Team Multisig</h4>
                <span className="text-gray-400 text-sm">Coming soon</span>
              </div>
              {/* Milestone work in progress section */}
              <h3 className="font-heading font-semibold mb-2 text-base text-white">Milestone work in progress</h3>
              {project.milestones && project.milestones.length > 0 ? (
                (() => {
                  // Normalize text and collect bullets. Handle literal "\\n" and the first non-dash line.
                  const bulletItems: string[] = [];
                  (project.milestones || []).forEach((m: ApiMilestone) => {
                    const raw = typeof m === 'string' ? m : (m?.description || '');
                    const normalized = (raw || '').replace(/\\n/g, '\n');
                    const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);
                    let encounteredDash = false;
                    lines.forEach((line, idx) => {
                      if (line.startsWith('- ')) {
                        encounteredDash = true;
                        bulletItems.push(line.slice(2));
                      } else {
                        // If this is the first line and subsequent lines include dashes, include it as a bullet too
                        // or if no dash has been encountered yet but this looks like a deliverable style line
                        if (idx === 0) {
                          bulletItems.push(line);
                        }
                      }
                    });
                  });
                  if (bulletItems.length > 0) {
                    return (
                      <div className="mb-4">
                        <ul className="list-disc pl-6 space-y-1">
                          {bulletItems.map((item: string, idx: number) => (
                            <li key={idx} className="text-white text-xs sm:text-sm">{item}</li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  // Fallback: render raw milestone lines
                  return (
                    <div className="mb-4">
                      <ul className="list-disc pl-6 space-y-1">
                        {project.milestones.map((m: ApiMilestone, i: number) => (
                          <li key={i} className="text-white text-xs sm:text-sm">{typeof m === 'string' ? m : (m?.description || '')}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })()
              ) : (
                <div className="mb-4 text-white text-xs sm:text-sm">No milestones confirmed.</div>
              )}
              <div className="flex justify-center mt-4">
                <Button size="sm" variant="outline" className="bg-yellow-200/80 text-yellow-900 font-semibold px-6 py-2 rounded shadow hover:bg-yellow-300 transition-colors" onClick={() => setDeliverableModalOpen(true)}>
                  Upload or update deliverables
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8 mt-16">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Built with ❤️ by WebZero.
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
          projectUrl={`/projects/${project.id}`}
        />
      )}
      
      {/* Update Team Modal */}
      {project && (
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
      )}
    </div>
  );
};

export default ProjectDetailsPage;
