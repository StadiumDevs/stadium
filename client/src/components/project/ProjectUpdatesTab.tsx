import { useCallback, useEffect, useState } from "react";
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
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim px-3 py-1.5"
        >
          <PenSquare className="h-3 w-3" aria-hidden="true" />
          POST UPDATE
        </button>
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
      <div className="flex items-center gap-2 label-hw-dim py-10">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> LOADING UPDATES…
      </div>
    );
  }

  if (error) {
    return <p className="label-hw text-destructive py-10">·{error.toUpperCase()}</p>;
  }

  if (updates.length === 0) {
    return (
      <div className="space-y-4">
        {postButton}
        <div className="panel p-10 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-label-dim" aria-hidden="true" />
          <span className="label-hw text-display block mt-3">·NOTHING HERE YET</span>
          <p className="mt-2 text-sm text-body max-w-md mx-auto">
            {canPost
              ? "Post the first update when something ships, pivots, or lands."
              : "Your team can post the first update when something ships, pivots, or lands."}
          </p>
        </div>
        {modal}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {postButton}
      <ol className="space-y-3" aria-label="Project updates, most recent first">
        {updates.map((u) => (
          <li key={u.id}>
            <div className="panel p-4 space-y-2">
              <div className="flex items-center justify-between label-hw-dim">
                <span className="font-mono">{truncateAddress(u.createdBy).toUpperCase()}</span>
                <time dateTime={u.createdAt} className="font-mono">
                  {formatDateTime(u.createdAt).toUpperCase()}
                </time>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-body">{u.body}</p>
              {u.linkUrl && (
                <a
                  href={u.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-display hover:underline break-all"
                >
                  <ExternalLink className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                  {u.linkUrl}
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
      {modal}
    </div>
  );
}
