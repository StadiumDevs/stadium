import { Gamepad2, Coins, Image, Wrench, Users, Layers, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

const filterCategories = {
  categories: [
    { id: "gaming", label: "Gaming", icon: <Gamepad2 className="w-3.5 h-3.5" /> },
    { id: "defi", label: "DeFi", icon: <Coins className="w-3.5 h-3.5" /> },
    { id: "nft", label: "NFT", icon: <Image className="w-3.5 h-3.5" /> },
    { id: "developer-tools", label: "Developer Tools", icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: "social", label: "Social", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "ai", label: "AI", icon: <Layers className="w-3.5 h-3.5" /> },
    { id: "arts", label: "Arts", icon: <Layers className="w-3.5 h-3.5" /> },
    { id: "mobile", label: "Mobile", icon: <Layers className="w-3.5 h-3.5" /> },
  ],
}

interface FilterSidebarProps {
  activeFilters: string[]
  onFilterChange: (filterId: string) => void
  onClearFilters: () => void
  showWinnersOnly: boolean
  onWinnersOnlyChange: (value: boolean) => void
  className?: string
}

const baseRow =
  "w-full inline-flex items-center justify-start gap-2 px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] uppercase border transition-colors";

export function FilterSidebar({
  activeFilters,
  onFilterChange,
  onClearFilters,
  showWinnersOnly,
  onWinnersOnlyChange,
  className,
}: FilterSidebarProps) {
  return (
    <div className={cn("panel p-4", className || "sticky top-20")}>
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-hairline-subtle">
        <span className="label-hw text-display">·FILTERS</span>
      </div>

      <div className="space-y-4">
        {/* Winners Filter */}
        <div>
          <h4 className="label-hw-dim mb-2">·SPECIAL</h4>
          <button
            type="button"
            onClick={() => onWinnersOnlyChange(!showWinnersOnly)}
            className={cn(
              baseRow,
              showWinnersOnly
                ? "border-display bg-display text-shell"
                : "border-hairline text-display hover:bg-panel-deep",
            )}
          >
            <Trophy className={cn("w-3.5 h-3.5", showWinnersOnly && "animate-pulse")} />
            WINNERS
          </button>
        </div>

        <div className="border-t border-hairline-subtle" />

        {/* Category Filters */}
        <div>
          <h4 className="label-hw-dim mb-2">·CATEGORIES</h4>
          <div className="space-y-1">
            {filterCategories.categories.map((filter) => {
              const active = activeFilters.includes(filter.id);
              return (
                <button
                  type="button"
                  key={filter.id}
                  onClick={() => onFilterChange(filter.id)}
                  className={cn(
                    baseRow,
                    active
                      ? "border-display bg-panel-deep text-display"
                      : "border-transparent text-label-mid hover:text-display hover:bg-panel-deep",
                  )}
                >
                  {filter.icon}
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Clear Filters */}
        {(activeFilters.length > 0 || showWinnersOnly) && (
          <>
            <div className="border-t border-hairline-subtle" />
            <button
              type="button"
              onClick={onClearFilters}
              className={cn(baseRow, "border-hairline text-label-mid hover:text-display hover:bg-panel-deep justify-center")}
            >
              CLEAR FILTERS
            </button>
          </>
        )}
      </div>
    </div>
  )
}
