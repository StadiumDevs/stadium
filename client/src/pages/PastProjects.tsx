import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterSidebar } from "@/components/FilterSidebar";
import { ProjectBubble } from "@/components/ProjectBubble";
import { DemoVideoModal } from "@/components/DemoVideoModal";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/api";

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

const ALL_CATEGORIES = [
  "Gaming",
  "DeFi",
  "NFT",
  "Developer Tools",
  "Social",
  "Other",
  "Winners",
];

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

type ApiProject = {
  id: string;
  projectName: string;
  description: string;
  teamMembers?: { name: string }[];
  projectRepo?: string;
  demoUrl?: string;
  slidesUrl?: string;
  donationAddress?: string;
  bountyPrize?: { name: string; amount: number; hackathonWonAtId: string }[];
  techStack?: string[];
  categories?: string[];
  hackathon?: { id: string; name: string; endDate: string };
};

const PastProjectsPage = () => {
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selectedHackathon, setSelectedHackathon] = useState<string>("all");
  const [videoProject, setVideoProject] = useState<ApiProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [hackathons, setHackathons] = useState<{ id: string; name: string }[]>([]);

  // Load hackathon list once
  useEffect(() => {
    const loadHackathons = async () => {
      try {
        const response = await api.getProjects({ limit: 2000, sortBy: "updatedAt", sortOrder: "desc" });
        const apiProjects: ApiProject[] = Array.isArray(response?.data) ? response.data : [];
        const unique = new Map<string, string>();
        for (const p of apiProjects) {
          if (p.hackathon?.id) unique.set(p.hackathon.id, p.hackathon.name || p.hackathon.id);
        }
        setHackathons(Array.from(unique.entries()).map(([id, name]) => ({ id, name })));
      } catch (e) {
        // ignore errors when building hackathon list
      }
    };
    loadHackathons();
  }, []);

  // Load projects when selected hackathon changes
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const params = selectedHackathon === 'all'
          ? { limit: 1000, sortBy: "updatedAt", sortOrder: "desc" }
          : { hackathonId: selectedHackathon, limit: 1000, sortBy: "updatedAt", sortOrder: "desc" };
        const response = await api.getProjects(params as { hackathonId?: string; limit: number; sortBy: string; sortOrder: 'asc' | 'desc' });
        const apiProjects: ApiProject[] = Array.isArray(response?.data) ? response.data : [];
        setProjects(apiProjects);
      } catch (e) {
        console.error("[PastProjects] Failed to load projects:", e);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedHackathon]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search
      const matchesSearch =
        !search ||
        project.projectName.toLowerCase().includes(search.toLowerCase()) ||
        (project.teamMembers?.[0]?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        project.description.toLowerCase().includes(search.toLowerCase());

      // Filters
      let matchesFilter = true;
      if (activeFilters.length > 0) {
        matchesFilter = false;
        for (const filter of activeFilters) {
          if (filter === "Winners") {
            let isWinner = false;
            const isSymmetry2024 = project.hackathon?.id === 'symmetry-2024';
            if (isSymmetry2024) {
              const winnerProjects = ["anytype - nft gating","delegit","empathy technologies","hypertents","papi actions","propcorn","ChainView"]; 
              isWinner = winnerProjects.some((winner) => project.projectName.toLowerCase().includes(winner.toLowerCase()));
            } else {
              isWinner = Array.isArray(project.bountyPrize) && project.bountyPrize.length > 0;
            }

            if (isWinner) {
              matchesFilter = true;
              break;
            }
          }
          // Categories: prefer explicit categories; fallback to derived from techStack
          const cats = Array.isArray(project.categories) && project.categories.length > 0
            ? project.categories
            : extractCategories(Array.isArray(project.techStack) ? project.techStack.join(", ") : (project.techStack as unknown as string) || "");
          if (cats.includes(filter)) {
            matchesFilter = true;
            break;
          }
        }
      }
      return matchesSearch && matchesFilter;
    });
  }, [projects, search, activeFilters]);

  // Skeleton bubbles for loading state
  const skeletons = Array.from({ length: 6 });

  return (
    <div className="container py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="flex items-center space-x-2">
              <ChevronLeft className="h-4 w-4" />
              <span>Go Back Home</span>
            </Link>
          </Button>
        </div>
        <h1 className="text-4xl font-bold mb-2">Past Projects</h1>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-sm text-muted-foreground">Hackathon:</label>
          <select
            className="border rounded px-2 py-1 text-sm bg-background text-white"
            value={selectedHackathon}
            onChange={(e) => setSelectedHackathon(e.target.value)}
          >
            <option value="all">All</option>
            {hackathons.map((h) => (
              <option key={h.id} value={h.id}>{h.name || h.id}</option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">({filteredProjects.length} projects)</span>
        </div>
      </div>
      {/* Two-column layout */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Mobile filter toggle button */}
        <div className="md:hidden mb-4">
          <Button size="sm" variant="outline" onClick={() => setFilterOpen((v) => !v)}>
            {filterOpen ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>
        {/* Sidebar, collapsible on mobile */}
        {(filterOpen || window.innerWidth >= 768) && (
          <FilterSidebar
            search={search}
            setSearch={setSearch}
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
            allCategories={ALL_CATEGORIES}
            activeCount={activeFilters.length}
            onClear={() => setActiveFilters([])}
          />
        )}
        {/* Bubble Gallery */}
        <div className="flex-1 bubble-grid">
          {loading ? (
            skeletons.map((_, idx) => (
              <div
                key={idx}
                className="project-bubble bg-gradient-to-br from-primary/10 to-accent/10 animate-pulse"
                style={{ minHeight: 220 + (idx % 3) * 40 }}
              />
            ))
          ) : (
            <AnimatePresence>
              {filteredProjects.length === 0 ? (
                <motion.div
                  className="col-span-full text-center text-muted-foreground py-12"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  No projects found.
                </motion.div>
              ) : (
                filteredProjects.map((project, idx) => (
                  <motion.div
                    key={project.projectName + idx}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: idx * 0.04 }}
                    style={{ "--index": idx } as React.CSSProperties }
                  >
                    <ProjectBubble
                      project={project}
                      onPlayDemo={setVideoProject}
                    />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
      {/* Video Modal */}
      <DemoVideoModal open={!!videoProject} onClose={() => setVideoProject(null)} project={videoProject} />
    </div>
  );
};

export default PastProjectsPage;
