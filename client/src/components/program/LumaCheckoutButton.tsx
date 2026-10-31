import { useEffect } from "react";

const SCRIPT_ID = "luma-checkout"; // Luma's script finds its own CSS via this id.
const SCRIPT_SRC = "https://embed.lu.ma/checkout-button.js";

type LumaWindow = Window & { luma?: { initCheckout?: () => void } };

/** Bind every `[data-luma-action="checkout"]` on the page (safe to call often). */
const bindLuma = () => {
  try {
    (window as LumaWindow).luma?.initCheckout?.();
  } catch {
    // The plain link still works.
  }
};

/**
 * Luma's embedded checkout: a click opens the event's registration in an
 * overlay on this page. The script loads only where a button renders. If it
 * is blocked or fails, the button is still a plain link to the Luma page.
 */
export function LumaCheckoutButton({
  eventId,
  eventUrl,
  children,
  className,
}: {
  eventId: string;
  eventUrl?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      // Loaded already (another visit in this SPA session): bind the new button.
      bindLuma();
      existing.addEventListener("load", bindLuma);
      return () => existing.removeEventListener("load", bindLuma);
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", bindLuma);
    document.body.appendChild(script);
    return () => script.removeEventListener("load", bindLuma);
  }, [eventId]);

  return (
    <a
      href={eventUrl || `https://luma.com/event/${eventId}`}
      target="_blank"
      rel="noopener noreferrer"
      data-luma-action="checkout"
      data-luma-event-id={eventId}
      data-testid="luma-checkout"
      className={className}
    >
      {children}
    </a>
  );
}
