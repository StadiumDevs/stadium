import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Sparkles, PenSquare } from "lucide-react";
import { api, type ApiProjectUpdate } from "@/lib/api";
import { PostUpdateModal } from "@/components/project/PostUpdateModal";

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const truncateAddress = (addr: string) => {
  if (!addr) return "team";
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
};

export function ProjectUpdatesTab({
  projectId,
  projectTitle,
  canPost,
  connectedAddress,
}: {
  projectId: string;
  projectTitle: string;
  /** True when the connected wallet is a team member of this project (or admin). */
  canPost: boolean;
  /** The wallet address currently connected, if any. Required for canPost=true. */
  connectedAddress?: string;
}) {
  const [updates, setUpdates] = useState<ApiProjectUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getProjectUpdates(projectId)
      .then((r) => {
        if (active) setUpdates(r.data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Failed to load updates");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  const handlePosted = (created: ApiProjectUpdate) => {
    setUpdates((prev) => [created, ...prev]);
  };

  const postButton =
    canPost && connectedAddress ? (
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <PenSquare className="h-4 w-4" aria-hidden="true" />
          Post update
        </Button>
      </div>
    ) : null;

  const modal =
    canPost && connectedAddress ? (
      <PostUpdateModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        projectId={projectId}
        projectTitle={projectTitle}
        connectedAddress={connectedAddress}
        onPosted={handlePosted}
      />
    ) : null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-10">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading updates…
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive py-10">{error}</p>;
  }

  if (updates.length === 0) {
    return (
      <div className="space-y-4">
        {postButton}
        <Card>
          <CardContent className="py-10 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">Nothing here yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canPost
                ? "Post the first update when something ships, pivots, or lands."
                : "Your team can post the first update when something ships, pivots, or lands."}
            </p>
          </CardContent>
        </Card>
        {modal}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {postButton}
      <ol className="space-y-4" aria-label="Project updates, most recent first">
        {updates.map((u) => (
          <li key={u.id}>
            <Card>
              <CardContent className="space-y-3 py-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{truncateAddress(u.createdBy)}</span>
                  <time dateTime={u.createdAt}>{formatDateTime(u.createdAt)}</time>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed">{u.body}</p>
                {u.linkUrl && (
                  <a
                    href={u.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    {u.linkUrl}
                  </a>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
      {modal}
    </div>
  );
}
