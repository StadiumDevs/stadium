import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { api, type ApiProject, type ApiProgram } from "@/lib/api";

/**
 * Global search palette. Triggered by:
 *   - Cmd/Ctrl + K anywhere in the app
 *   - The SEARCH button in Navigation
 *   - Any caller passing `open` + `onOpenChange` (e.g. a future mobile FAB)
 *
 * Search hits both `projects` and `programs` lists in parallel. On select,
 * navigates to the canonical detail page and closes the palette. Cmdk does
 * fuzzy filtering client-side; we don't round-trip the query.
 */
export function SearchPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [programs, setPrograms] = useState<ApiProgram[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  // Lazy-load the search corpus once on first open. Loading both lists
  // costs one extra request beyond what the home page already does, and
  // cmdk filters client-side from there. Refresh-on-mount happens because
  // the dialog unmounts between sessions when the parent re-renders.
  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    Promise.all([
      api.getProjects({ limit: 1000, sortBy: "updatedAt", sortOrder: "desc" }).catch(() => null),
      api.listPrograms().catch(() => null),
    ])
      .then(([projectResp, programResp]) => {
        if (projectResp?.data) setProjects(projectResp.data);
        if (programResp?.data) setPrograms(programResp.data);
      })
      .finally(() => setLoading(false));
  }, [open]);

  // Cmd/Ctrl + K toggles the palette from anywhere on the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const selectProject = useCallback(
    (id: string) => {
      onOpenChange(false);
      setQuery("");
      navigate(`/m2-program/${id}`);
    },
    [navigate, onOpenChange],
  );

  const selectProgram = useCallback(
    (slug: string) => {
      onOpenChange(false);
      setQuery("");
      navigate(`/programs/${slug}`);
    },
    [navigate, onOpenChange],
  );

  // Pre-compute searchable hints so cmdk's matcher catches them even when
  // they're hidden from the rendered row (author name, project id, etc.).
  const projectItems = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id,
        title: p.projectName,
        meta: p.teamMembers?.[0]?.name || "Unknown team",
        keywords: [
          p.projectName,
          p.teamMembers?.[0]?.name || "",
          p.hackathon?.name || "",
          ...(p.categories || []),
          ...(p.techStack || []),
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [projects],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search projects, programs, teams…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[60vh]">
        {loading ? (
          <div className="flex items-center gap-2 label-hw-dim py-4 px-4">
            <Loader2 className="h-3 w-3 animate-spin" /> LOADING SEARCH INDEX…
          </div>
        ) : (
          <>
            <CommandEmpty>
              <span className="label-hw-dim">·NO MATCHES</span>
            </CommandEmpty>

            {programs.length > 0 && (
              <CommandGroup heading="PROGRAMS">
                {programs.map((p) => (
                  <CommandItem
                    key={`prog-${p.id}`}
                    value={`program ${p.name} ${p.slug} ${p.programType}`}
                    onSelect={() => selectProgram(p.slug)}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[12px] text-display truncate">
                        {p.name}
                      </div>
                      <div className="label-hw-dim truncate">
                        {p.programType.toUpperCase()}
                        {p.location ? ` · ${p.location.toUpperCase()}` : ""}
                      </div>
                    </div>
                    <span className="label-hw-dim flex-shrink-0">
                      {p.status.toUpperCase()}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {projectItems.length > 0 && (
              <CommandGroup heading="PROJECTS">
                {projectItems.map((p) => (
                  <CommandItem
                    key={`proj-${p.id}`}
                    value={`project ${p.title} ${p.keywords}`}
                    onSelect={() => selectProject(p.id)}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[12px] text-display truncate">
                        {p.title}
                      </div>
                      <div className="label-hw-dim truncate">BY {p.meta.toUpperCase()}</div>
                    </div>
                    <Search className="h-3 w-3 text-label-dim flex-shrink-0" aria-hidden="true" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
