import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface InputBusProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  kbdHint?: string;           // "⌘K"
  autoFocus?: boolean;
  className?: string;
}

export function InputBus({
  value,
  onChange,
  placeholder = "search...",
  kbdHint,
  autoFocus,
  className,
}: InputBusProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!kbdHint) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [kbdHint]);

  return (
    <div className={cn("lcd px-3 py-1.5 flex items-center gap-2", className)}>
      <span className="text-label-dim font-mono text-[11px] flex-shrink-0">◆</span>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-0 outline-none font-mono text-[12px] text-display placeholder:text-label-dim caret-display"
      />
      {kbdHint && (
        <kbd className="label-hw-dim flex-shrink-0">{kbdHint}</kbd>
      )}
    </div>
  );
}
