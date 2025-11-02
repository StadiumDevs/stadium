import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Inbox, SearchX } from "lucide-react"

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <Card className="text-center py-12">
      <CardContent className="space-y-4">
        {icon || <Inbox className="h-12 w-12 text-muted-foreground mx-auto" />}
        <h3 className="font-heading text-xl font-semibold text-foreground">
          {title}
        </h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          {description}
        </p>
        {actionLabel && onAction && (
          <Button onClick={onAction} variant="outline" className="mt-4">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function NoProjectsFound({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      title="No projects found"
      description="Try adjusting your filters or search query to find more projects."
      actionLabel={onClearFilters ? "Clear filters" : undefined}
      onAction={onClearFilters}
      icon={<SearchX className="h-12 w-12 text-muted-foreground mx-auto" />}
    />
  )
}

export function NoResultsFound({ onClearSearch }: { onClearSearch?: () => void }) {
  return (
    <EmptyState
      title="No results found"
      description="We couldn't find any projects matching your search. Try different keywords or clear your search."
      actionLabel={onClearSearch ? "Clear search" : undefined}
      onAction={onClearSearch}
      icon={<SearchX className="h-12 w-12 text-muted-foreground mx-auto" />}
    />
  )
}

