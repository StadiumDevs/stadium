import { useState } from "react";

/**
 * Judges and admins only: the builder's optional testnet viewing key and the
 * wallet's birth height, so a judge can import it read-only and see the
 * payment's amount and memo. Never rendered on the public page.
 */
export function ViewingKeyLine({ viewingKey, birthHeight }: { viewingKey: string; birthHeight?: number | null }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(viewingKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable: the key is still selectable.
    }
  };
  return (
    <div className="space-y-0.5 text-[12px]" data-testid="viewing-key">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label-hw-dim">VIEWING KEY</span>
        <button type="button" onClick={copy} className="font-mono text-[10px] tracking-[0.12em] underline text-label-mid hover:text-display">
          {copied ? "COPIED" : "COPY"}
        </button>
        <span className="label-hw-dim">
          BIRTH HEIGHT · {birthHeight === null || birthHeight === undefined ? "not given" : birthHeight}
        </span>
      </div>
      <code className="block font-mono text-[11px] text-body break-all select-all">{viewingKey}</code>
    </div>
  );
}
