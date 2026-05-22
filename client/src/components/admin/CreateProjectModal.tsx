import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { web3Enable, web3Accounts, web3FromSource } from "@polkadot/extension-dapp";
import { SiwsMessage } from "@talismn/siws";
import { generateSiwsStatement } from "@/lib/siwsUtils";
import { api, type ApiProject } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ALLOWED_CATEGORIES = ["Gaming", "DeFi", "NFT", "Developer Tools", "Social", "AI", "Arts", "Mobile"];

type TeamMemberRow = { name: string; walletAddress: string };

export function CreateProjectModal({
  open,
  onOpenChange,
  connectedAddress,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  connectedAddress: string | undefined;
  onSaved: (project: ApiProject) => void;
}) {
  const [projectName, setProjectName] = useState("");
  const [id, setId] = useState("");
  const [description, setDescription] = useState("");
  const [projectRepo, setProjectRepo] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [hackathonName, setHackathonName] = useState("");
  const [hackathonId, setHackathonId] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setProjectName("");
    setId("");
    setDescription("");
    setProjectRepo("");
    setDemoUrl("");
    setHackathonName("");
    setHackathonId("");
    setSelectedCategories([]);
    setTeamMembers([]);
    setErrors({});
  }, [open]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const addTeamMember = () =>
    setTeamMembers((prev) => [...prev, { name: "", walletAddress: "" }]);

  const removeTeamMember = (i: number) =>
    setTeamMembers((prev) => prev.filter((_, idx) => idx !== i));

  const updateTeamMember = (i: number, field: keyof TeamMemberRow, value: string) =>
    setTeamMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!projectName.trim()) e.projectName = "Project name is required.";
    if (projectName.trim().length > 200) e.projectName = "Project name must be 200 characters or fewer.";
    if (projectRepo && !projectRepo.startsWith("http") && !projectRepo.startsWith("www")) {
      e.projectRepo = "Repository URL must start with www or http.";
    }
    if (demoUrl && !demoUrl.startsWith("http") && !demoUrl.startsWith("www")) {
      e.demoUrl = "Demo URL must start with www or http.";
    }
    teamMembers.forEach((m, i) => {
      if (!m.name.trim()) e[`teamMember_${i}_name`] = `Team member ${i + 1}: name is required.`;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!connectedAddress) {
      toast({ title: "Connect an admin wallet first", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await web3Enable("Stadium");
      const accounts = await web3Accounts();
      const account = accounts.find((a) => a.address === connectedAddress);
      if (!account) throw new Error("Connected wallet account not found");

      const siws = new SiwsMessage({
        domain: window.location.hostname,
        uri: window.location.origin,
        address: account.address,
        nonce: Math.random().toString(36).slice(2),
        statement: generateSiwsStatement({ action: "create-project" }),
      });
      const injector = await web3FromSource(account.meta.source);
      const signed = (await siws.sign(injector)) as unknown as {
        signature: string;
        message?: string;
      };
      const messageStr =
        typeof signed.message === "string" && signed.message
          ? signed.message
          : (siws as unknown as { toString: () => string }).toString();
      const authHeader = btoa(
        JSON.stringify({
          message: messageStr,
          signature: signed.signature,
          address: account.address,
        }),
      );

      const payload: Partial<ApiProject> & { projectName: string } = {
        projectName: projectName.trim(),
        description: description.trim() || undefined,
        projectRepo: projectRepo.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        teamMembers:
          teamMembers.length > 0
            ? teamMembers.map((m) => ({
                name: m.name.trim(),
                walletAddress: m.walletAddress.trim() || undefined,
              }))
            : undefined,
        hackathon:
          hackathonName.trim() || hackathonId.trim()
            ? {
                id: hackathonId.trim(),
                name: hackathonName.trim(),
                endDate: "",
              }
            : undefined,
      };
      if (id.trim()) payload.id = id.trim();

      const res = await api.createProject(payload, authHeader);
      onSaved(res.data);
      toast({ title: "Project created" });
      onOpenChange(false);
    } catch (e) {
      const err = e as Error & { status?: number };
      toast({
        title: "Couldn't create project",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">CREATE PROJECT</DialogTitle>
          <DialogDescription className="text-body">
            Add a new project to the M2 incubator. Only the project name is required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="cp-name">Project name *</Label>
            <Input
              id="cp-name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              aria-invalid={errors.projectName ? true : undefined}
            />
            {errors.projectName && (
              <p className="text-xs text-destructive">{errors.projectName}</p>
            )}
          </div>

          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="cp-id">
              ID{" "}
              <span className="text-muted-foreground text-xs font-normal">
                (optional, auto-derived from name if blank)
              </span>
            </Label>
            <Input
              id="cp-id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="my-project-id"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="cp-description">Description</Label>
            <Textarea
              id="cp-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cp-repo">Repository URL</Label>
            <Input
              id="cp-repo"
              value={projectRepo}
              onChange={(e) => setProjectRepo(e.target.value)}
              placeholder="https://github.com/org/repo"
              aria-invalid={errors.projectRepo ? true : undefined}
            />
            {errors.projectRepo && (
              <p className="text-xs text-destructive">{errors.projectRepo}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cp-demo">Demo URL</Label>
            <Input
              id="cp-demo"
              value={demoUrl}
              onChange={(e) => setDemoUrl(e.target.value)}
              placeholder="https://demo.example.com"
              aria-invalid={errors.demoUrl ? true : undefined}
            />
            {errors.demoUrl && (
              <p className="text-xs text-destructive">{errors.demoUrl}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cp-hackathon-name">Hackathon name</Label>
            <Input
              id="cp-hackathon-name"
              value={hackathonName}
              onChange={(e) => setHackathonName(e.target.value)}
              placeholder="WebZero Hackathon 2025"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cp-hackathon-id">Hackathon ID</Label>
            <Input
              id="cp-hackathon-id"
              value={hackathonId}
              onChange={(e) => setHackathonId(e.target.value)}
              placeholder="wz-hackathon-2025"
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label>Categories</Label>
            <div className="flex flex-wrap gap-2">
              {ALLOWED_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    selectedCategories.includes(cat)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label>Team members</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addTeamMember}>
                <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                Add member
              </Button>
            </div>
            {teamMembers.length === 0 && (
              <p className="text-xs text-muted-foreground">No team members added yet.</p>
            )}
            {teamMembers.map((member, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                <div className="space-y-1">
                  <Input
                    placeholder="Name"
                    value={member.name}
                    onChange={(e) => updateTeamMember(i, "name", e.target.value)}
                    aria-invalid={errors[`teamMember_${i}_name`] ? true : undefined}
                  />
                  {errors[`teamMember_${i}_name`] && (
                    <p className="text-xs text-destructive">
                      {errors[`teamMember_${i}_name`]}
                    </p>
                  )}
                </div>
                <Input
                  placeholder="Wallet address (optional)"
                  value={member.walletAddress}
                  onChange={(e) => updateTeamMember(i, "walletAddress", e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTeamMember(i)}
                  aria-label="Remove team member"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> CREATING…
              </>
            ) : (
              "CREATE PROJECT ▸"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
