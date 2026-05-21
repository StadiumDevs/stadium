import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrightnessRack } from "./brightness-rack";
import { SearchPalette } from "./SearchPalette";

const TABS = [
  { href: "/", label: "HOME" },
  { href: "/m2-program", label: "M2" },
  { href: "/programs", label: "PROGRAMS" },
  { href: "/admin", label: "ADMIN" },
];

export function Navigation() {
  const location = useLocation();
  const pathname = location.pathname;
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 panel border-b">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Top strip — brand + tabs + search + online status.
            Layout is responsive: tabs are scrollable on narrow screens; the
            online label collapses to just the LED dot on small screens. */}
        <div className="flex items-center justify-between h-12 gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
            <span className="led" aria-hidden="true" />
            <span className="font-mono font-bold text-[13px] sm:text-[15px] text-display tracking-wide">
              STADIUM <span className="text-label-dim font-normal text-[10px] sm:text-[11px]">|||</span>
            </span>
          </Link>

          {/* Hardware tab strip — scrolls horizontally on narrow screens
              rather than overflowing. -mx- so the scrollbar sits flush. */}
          <div
            className="flex overflow-x-auto no-scrollbar -mx-1 px-1 flex-shrink min-w-0"
            role="tablist"
          >
            {TABS.map((tab, i) => {
              const active =
                pathname === tab.href ||
                (tab.href !== "/" && pathname.startsWith(tab.href));
              return (
                <Link
                  key={tab.href}
                  to={tab.href}
                  role="tab"
                  aria-selected={active}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "px-2.5 sm:px-3 py-1 font-mono text-[10px] tracking-[0.14em] border border-hairline transition-colors duration-150 whitespace-nowrap",
                    i > 0 && "border-l-0",
                    active
                      ? "bg-display text-shell font-bold"
                      : "bg-shell text-label-dim hover:text-display",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Global search — visible everywhere, full keyboard shortcut. */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search (Cmd+K)"
              title="Search projects and programs (⌘K)"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep h-7 px-2"
            >
              <Search className="h-3 w-3" />
              <span className="hidden sm:inline">SEARCH</span>
              <kbd className="hidden md:inline label-hw-dim border border-hairline px-1 py-0 leading-none">
                ⌘K
              </kbd>
            </button>

            {/* Status dot — label hidden on small screens. */}
            <span className="led" aria-hidden="true" />
            <span className="label-hw hidden sm:inline">ONLINE</span>
          </div>
        </div>

        {/* Brightness rack — second row. On mobile it defaults to its
            collapsed strip so it doesn't dominate the viewport. */}
        <div className="pb-2">
          <BrightnessRack />
        </div>
      </div>

      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </nav>
  );
}
