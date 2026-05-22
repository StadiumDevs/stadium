// Shared site footer. Single source of truth so the credit line + links don't
// drift between Layout-wrapped pages and the standalone detail pages.
export function SiteFooter() {
  return (
    <footer className="panel mt-16">
      <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-3 font-mono text-[10px] tracking-[0.14em] text-label-dim">
        <div className="flex items-center gap-1">
          <span>Created with ❤️ by</span>
          <a
            href="https://x.com/sachalansky"
            target="_blank"
            rel="noopener noreferrer"
            className="text-label-dim hover:text-display transition-colors"
          >
            sachalansky
          </a>
          <span>from</span>
          <a
            href="https://www.joinwebzero.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-label-dim hover:text-display transition-colors"
          >
            WebZero
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
          <a
            href="https://luma.com/blockspace-symmetry"
            target="_blank"
            rel="noopener noreferrer"
            className="text-label-dim hover:text-display transition-colors"
          >
            Blockspace Symmetry 2024
          </a>
          <span className="text-hairline">·</span>
          <a
            href="https://luma.com/blockspacesynergy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-label-dim hover:text-display transition-colors"
          >
            Blockspace Synergy 2025
          </a>
          <span className="text-hairline">·</span>
          <a
            href="https://luma.com/sub0hack"
            target="_blank"
            rel="noopener noreferrer"
            className="text-label-dim hover:text-display transition-colors"
          >
            sub0 Hack 2025
          </a>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/StadiumDevs/stadium"
            target="_blank"
            rel="noopener noreferrer"
            className="text-label-dim hover:text-display transition-colors"
          >
            SOURCE
          </a>
          <a
            href="https://github.com/JoinWebZero/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-label-dim hover:text-display transition-colors"
          >
            GITHUB
          </a>
          <a
            href="https://x.com/JoinWebZero"
            target="_blank"
            rel="noopener noreferrer"
            className="text-label-dim hover:text-display transition-colors"
          >
            X
          </a>
        </div>
      </div>
    </footer>
  );
}
