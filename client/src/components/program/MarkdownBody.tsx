import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders trusted, first-party markdown (program content, submission terms) in
 * the console's visual language: black underlined links that open in a new tab,
 * mono code blocks on the recessed panel, and brand type styles for headings and
 * lists. No raw HTML is allowed (react-markdown skips it by default), so this is
 * safe for curated content authored by the team.
 */
export function MarkdownBody({ children }: { children: string }) {
  return (
    <div className="space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="text-body text-base leading-relaxed">{children}</p>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-display underline underline-offset-2 hover:text-display-dim break-words"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="text-display font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => (
            <h3 className="font-display text-xl tracking-tight text-display uppercase leading-tight">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className="font-display text-lg tracking-tight text-display uppercase leading-tight">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="label-hw text-display">·{children}</h4>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1.5 list-disc pl-5 marker:text-label-dim text-body text-base leading-relaxed">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1.5 list-decimal pl-5 marker:text-label-dim text-body text-base leading-relaxed">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ children }) => (
            <code className="font-mono text-[13px] bg-panel-deep border border-hairline-subtle rounded-sm px-1 py-[1px] text-display break-words">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="lcd p-3 overflow-x-auto font-mono text-[13px] text-display [&_code]:bg-transparent [&_code]:border-0 [&_code]:p-0">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-hairline pl-3 text-body text-base leading-relaxed">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-hairline-subtle" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
