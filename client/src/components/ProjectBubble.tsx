import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProjectBubbleProps {
  project: any;
  onPlayDemo: (project: any) => void;
}

export const ProjectBubble: React.FC<ProjectBubbleProps> = ({ project, onPlayDemo }) => {
  // Determine author names from either legacy field or API teamMembers
  const authorNames = Array.isArray(project.teamMembers) && project.teamMembers.length > 0
    ? project.teamMembers.map((m: any) => m?.name).filter(Boolean).join(", ")
    : (project.teamLead || "");

  // Check if project is a winner - handle both data structures
  const hasBountyWinner = Array.isArray(project.bountyPrize) && project.bountyPrize.length > 0;
  const isWinner = (project.winner && project.winner !== "") || hasBountyWinner;
  
  // Check if project is a symmetry-2024 winner (hardcoded list)
  const isSymmetryWinner = () => {
    const winnerProjects = [
      "anytype - nft gating",
      "delegit", 
      "empathy technologies",
      "hypertents",
      "papi actions",
      "propcorn",
      "ChainView"
    ];
    return winnerProjects.some(winner =>
      project.projectName.toLowerCase().includes(winner.toLowerCase())
    ) || (project.milestones && project.milestones.length > 3);
  };
  
  // Determine if we should show a winner badge
  const shouldShowWinnerBadge = isWinner || isSymmetryWinner();
  
  // Get the winner text for symmetry-2024 projects
  const getWinnerText = () => {
    if (project.winner && project.winner !== "") {
      return project.winner;
    }
    if (hasBountyWinner) {
      return project.bountyPrize[0]?.name || "";
    }
    if (isSymmetryWinner()) {
      return "Polkadot main track";
    }
    return "";
  };

  return (
    <div
      className="project-bubble group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-primary/20 to-accent/20 p-4"
    >
      <div className="flex flex-col h-full relative">
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-lg truncate text-white drop-shadow-sm flex-1 mr-2">{project.projectName}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-2 truncate">By {authorNames}</p>
        </div>
        {shouldShowWinnerBadge && (
          <Badge 
            variant="secondary" 
            className={`absolute -top-2 -right-2 text-[8px] px-0.5 py-0 ${
              getWinnerText()?.toLowerCase().includes('kusama')
                ? 'bg-purple-600/20 text-purple-300 border-purple-600/30'
                : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
            }`}
          >
            🏆 {getWinnerText()
              .split(' ')
              .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ')}
          </Badge>
        )}
        <p className="text-xs text-muted-foreground line-clamp-3 mb-2 flex-1">{project.description}</p>
      </div>
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPlayDemo(project);
          }}
          size="lg"
          className="text-lg"
        >
          ▶️ Learn More
        </Button>
      </div>
    </div>
  );
}; 