import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BrightnessRack } from "./brightness-rack";

const TABS = [
  { href: "/", label: "HOME" },
  { href: "/m2-program", label: "M2" },
  { href: "/programs", label: "PROGRAMS" },
  { href: "/admin", label: "ADMIN" },
];

export function Navigation() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className="sticky top-0 z-50 panel border-b">
      <div className="container mx-auto px-4">
        {/* Top strip — brand + tabs + online status */}
        <div className="flex items-center justify-between h-12 gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="led" aria-hidden="true" />
            <span className="font-mono font-bold text-[15px] text-display tracking-wide">
              STADIUM <span className="text-label-dim font-normal text-[11px]">|||</span>
            </span>
          </Link>

          {/* Hardware tab strip — flush buttons, no gaps */}
          <div className="flex" role="tablist">
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
                    "px-3 py-1 font-mono text-[10px] tracking-[0.14em] border border-hairline transition-colors duration-150",
                    i > 0 && "border-l-0",
                    active
                      ? "bg-display text-shell font-bold"
                      : "bg-shell text-label-dim hover:text-display"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="led" aria-hidden="true" />
            <span className="label-hw">ONLINE</span>
          </div>
        </div>

        {/* Second row — brightness rack, always visible */}
        <div className="pb-2">
          <BrightnessRack />
        </div>
      </div>
    </nav>
  );
}
