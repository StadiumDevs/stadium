import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Github, Globe, CheckCircle, XCircle, ExternalLink, Heart } from "lucide-react";

function convertToEmbedUrl(url: string) {
  if (!url) return "";
  if (url.includes("youtube.com")) {
    return url.replace("watch?v=", "embed/");
  }
  if (url.includes("youtu.be/")) {
    return url.replace("youtu.be/", "youtube.com/embed/");
  }
  if (url.includes("vimeo.com")) {
    return url.replace("vimeo.com", "player.vimeo.com/video");
  }
  return url;
}

// Category mapping for tech stack
const CATEGORY_MAP: Record<string, string> = {
  // Symmetry 2024 categories
  "Rust": "Developer Tools",
  "wasm": "Developer Tools",
  "typescript": "Developer Tools",
  "TS": "Developer Tools",
  "react": "Developer Tools",
  "NEXT": "Developer Tools",
  "Next.js": "Developer Tools",
  "NextJS": "Developer Tools",
  "Golang": "Developer Tools",
  "Python": "Developer Tools",
  "deno": "Developer Tools",
  "Solidity": "DeFi",
  "EVM": "DeFi",
  "Polkadot": "DeFi",
  "Cairo": "DeFi",
  "NFT": "NFT",
  "Figma": "NFT",
  "JavaScript": "Developer Tools",
  "JS": "Developer Tools",
  "Jetson Nano": "Gaming",
  "Substrate": "Developer Tools",
  "GraphViz": "Developer Tools",
  "Mongo": "Developer Tools",
  "mongoDB": "Developer Tools",
  "Flutter": "Developer Tools",
  "React Native": "Developer Tools",
  "Wagmi": "DeFi",
  "Viem": "DeFi",
  "Sepolia": "DeFi",
  "Blink": "DeFi",
  "Phantom Wallet": "DeFi",
  "Solana": "DeFi",
  "Web3.js": "DeFi",
  "Livepeer": "Social",
  "Langchain": "Developer Tools",
  "CSS": "Developer Tools",
  "HTML": "Developer Tools",
  "Gaming": "Gaming",
  "Social": "Social",
  "F#": "Developer Tools",
  "Flask": "Developer Tools",
  "ethers.js": "DeFi",
  "Ollama": "Developer Tools",
  "EVM Pallet": "DeFi",
  "dephy messaging layer": "Developer Tools",
  "DePHY ID": "Developer Tools",
  "Structured Causal Models": "Developer Tools",
  "Rootstock": "DeFi",
  "Cere Network": "DeFi",
  "Goldsky Subgraph": "Developer Tools",
  "SQL": "Developer Tools",
  "Nextjs": "Developer Tools",
  "Papi": "Developer Tools",
  "DotConnect": "Developer Tools",
  // Synergy 2025 categories
  "Kusama": "DeFi", 
  "ink!": "Developer Tools",
  "Other": "Other",
};

function extractCategories(techStack: string): string[] {
  return techStack
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t && t.toLowerCase() !== "nan")
    .map((t) => {
      // Try exact match first
      if (CATEGORY_MAP[t]) {
        return CATEGORY_MAP[t];
      }
      // Try case-insensitive match
      const lowerT = t.toLowerCase();
      for (const [key, value] of Object.entries(CATEGORY_MAP)) {
        if (key.toLowerCase() === lowerT) {
          return value;
        }
      }
      return t;
    });
}

const categoryIcons: Record<string, string> = {
  "Gaming": "🎮",
  "DeFi": "💰",
  "NFT": "🎨",
  "Developer Tools": "🛠️",
  "Social": "🌐",
  "Other": "🔧",
  "Winners": "🏆",
};

interface DemoVideoModalProps {
  open: boolean;
  onClose: () => void;
  project: any | null;
}

export const DemoVideoModal: React.FC<DemoVideoModalProps> = ({ open, onClose, project }) => {
  if (!project) return null;

  // Check if project is a winner - handle both data structures
  const hasBountyWinner = Array.isArray(project.bountyPrize) && project.bountyPrize.length > 0;
  const isWinner = hasBountyWinner || (project.winner && project.winner !== "");

  // Check milestone completion status - 2025 winners don't have completed milestones yet
  const getMilestoneStatus = () => {
    if (!isWinner) return null;
    // For 2025 winners, milestones are not yet completed
    return "pending";
  };

  const milestoneStatus = getMilestoneStatus();

  // Extract categories from tech stack
  const projectCategories = extractCategories(Array.isArray(project.techStack) ? project.techStack.join(", ") : project.techStack || "");

  // Determine winner text safely
  const winnerText = (project.winner && project.winner !== "")
    ? project.winner
    : (hasBountyWinner ? (project.bountyPrize?.[0]?.name || "") : "");

  // Override demo URL for delegit to use their live site
  const getDemoUrl = () => {
    if (project.projectName.toLowerCase().includes("delegit")) {
      return "https://delegit.xyz/?network=polkadot-lc";
    }
    if (project.projectName.toLowerCase().includes("propcorn")) {
      return "https://propcorn.xyz/";
    }
    return project.demoUrl && project.demoUrl !== "nan" ? project.demoUrl : (project.slidesUrl && project.slidesUrl !== "nan" ? project.slidesUrl : "");
  };

  const demoUrl = getDemoUrl();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-xs sm:max-w-md md:max-w-3xl p-2 sm:p-6 mx-auto my-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project.projectName}</DialogTitle>
          <DialogDescription>Project details and demo media</DialogDescription>
        </DialogHeader>
        <div className="relative bg-black min-h-[220px] h-56 sm:aspect-video sm:h-auto sm:max-h-[50vh] mb-6 rounded overflow-hidden">
          {demoUrl && demoUrl !== "nan" ? (
            <iframe
              src={convertToEmbedUrl(demoUrl)}
              className="w-full h-full min-h-[220px] max-w-full rounded"
              allowFullScreen
              title="Demo Video"
              style={{ display: 'block', maxHeight: '100%' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white">
              <p>Demo video not available</p>
            </div>
          )}
        </div>
        <div className="px-2 sm:px-6 pb-4 mt-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base sm:text-2xl font-bold pr-2 break-words max-w-full">{project.projectName}</h2>
            <div className="flex gap-2 flex-wrap">
              {isWinner && (
                <Badge variant="secondary" className="px-2 py-1 bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs break-words max-w-full">
                  🏆 {(winnerText || "Winner")
                    .split(' ')
                    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                    .join(' ')}
                </Badge>
              )}
              {milestoneStatus === "completed" && (
                <Badge variant="secondary" className="px-2 py-1 bg-white/20 text-white border-white/30 text-xs">☑️ Completed Milestones</Badge>
              )}
              {milestoneStatus === "pending" && (
                <Badge variant="secondary" className="px-2 py-1 bg-purple-400/20 text-purple-200 border-purple-400/30 text-xs">⏳ Milestones Pending</Badge>
              )}
            </div>
          </div>
          <p className="mb-6 text-sm md:text-base text-muted-foreground leading-relaxed break-words max-w-full">{project.description}</p>
          {/* Project Categories */}
          {projectCategories.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 text-white">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(projectCategories)).map((category, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-xs px-2 py-1 border-primary/30 text-primary break-words max-w-full"
                  >
                    <span className="mr-1">{categoryIcons[category] || "🔧"}</span>
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {/* Donation Address Section */}
          {project.donationAddress && (
            <div className="mb-6 p-3 bg-gradient-to-r from-pink-500/5 to-red-500/5 rounded-md border border-pink-500/20 overflow-x-auto">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2 break-all">
                  <Heart className="h-3 w-3 text-pink-500" />
                  <span className="text-xs text-pink-500 font-medium">Donate:</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {project.donationAddress.slice(0, 8)}...{project.donationAddress.slice(-6)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-pink-500 hover:bg-pink-500/10 h-6 px-2 text-xs"
                  asChild
                >
                  <a 
                    href={`https://assethub-polkadot.subscan.io/account/${project.donationAddress}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Subscan</span>
                  </a>
                </Button>
              </div>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {project.githubRepo && project.githubRepo !== "nan" && (
              <Button variant="outline" asChild className="text-xs sm:text-sm break-words max-w-full">
                <a href={project.githubRepo} target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-4 w-4" /> View Code
                </a>
              </Button>
            )}
            {demoUrl && demoUrl !== "nan" && (
              <Button asChild className="text-xs sm:text-sm break-words max-w-full">
                <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                  <Globe className="mr-2 h-4 w-4" /> Visit Site
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 