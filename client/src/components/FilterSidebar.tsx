import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Gamepad2, Coins, Image, Wrench, Users, Layers, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterOption {
  id: string
  label: string
  icon: React.ReactNode
  count?: number
}

const filterCategories = {
  categories: [
    { id: "gaming", label: "Gaming", icon: <Gamepad2 className="w-4 h-4" /> },
    { id: "defi", label: "DeFi", icon: <Coins className="w-4 h-4" /> },
    { id: "nft", label: "NFT", icon: <Image className="w-4 h-4" /> },
    { id: "developer-tools", label: "Developer Tools", icon: <Wrench className="w-4 h-4" /> },
    { id: "social", label: "Social", icon: <Users className="w-4 h-4" /> },
    { id: "ai", label: "AI", icon: <Layers className="w-4 h-4" /> },
    { id: "arts", label: "Arts", icon: <Layers className="w-4 h-4" /> },
    { id: "mobile", label: "Mobile", icon: <Layers className="w-4 h-4" /> },
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

export function FilterSidebar({
  activeFilters,
  onFilterChange,
  onClearFilters,
  showWinnersOnly,
  onWinnersOnlyChange,
  className,
}: FilterSidebarProps) {
  return (
    <Card className={className || "sticky top-20"}>
      <CardHeader>
        <CardTitle className="font-heading text-base">Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Winners Filter */}
        <div>
          <h4 className="text-sm font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
            Special
          </h4>
          <Button
            variant={showWinnersOnly ? "default" : "outline"}
            className={cn(
              "w-full justify-start transition-all duration-200",
              showWinnersOnly && "bg-yellow-500/10 border-yellow-500 text-yellow-500 hover:bg-yellow-500/20"
            )}
            onClick={() => onWinnersOnlyChange(!showWinnersOnly)}
          >
            <Trophy className={cn(
              "w-4 h-4 mr-2 transition-all duration-200",
              showWinnersOnly && "animate-pulse"
            )} />
            Winners
          </Button>
        </div>

        <Separator />

        {/* Category Filters */}
        <div>
          <h4 className="text-sm font-semibold mb-2 uppercase tracking-wide text-muted-foreground">
            Categories
          </h4>
          <div className="space-y-1">
            {filterCategories.categories.map((filter) => (
              <Button
                key={filter.id}
                variant={activeFilters.includes(filter.id) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start transition-all duration-200",
                  activeFilters.includes(filter.id) && "bg-primary/10 text-accent"
                )}
                onClick={() => onFilterChange(filter.id)}
              >
                {filter.icon}
                <span className="ml-2">{filter.label}</span>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Clear Filters */}
        {(activeFilters.length > 0 || showWinnersOnly) && (
          <Button
            variant="outline"
            className="w-full border-primary text-accent hover:bg-primary/10"
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
        )}
      </CardContent>
    </Card>
  )
}