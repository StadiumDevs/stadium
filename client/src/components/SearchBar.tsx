import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"

interface SearchBarProps {
  onSearchChange: (query: string) => void
  onHackathonChange: (hackathon: string) => void
  hackathons: { id: string; name: string }[]
  projectCount?: number
  selectedHackathon?: string
}

export function SearchBar({
  onSearchChange,
  onHackathonChange,
  hackathons,
  projectCount,
  selectedHackathon = "all",
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
      <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              onSearchChange(e.target.value)
            }}
            className="pl-10"
            aria-label="Search projects by name, author, or description"
          />
        </div>

        {/* Hackathon Dropdown */}
        <div className="flex items-center gap-2 sm:min-w-[240px]">
          <label htmlFor="hackathon-select" className="text-sm text-muted-foreground whitespace-nowrap">
            Hackathon:
          </label>
          <Select onValueChange={onHackathonChange} value={selectedHackathon}>
            <SelectTrigger id="hackathon-select" aria-label="Select hackathon to filter projects">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {hackathons.map((hackathon) => (
                <SelectItem key={hackathon.id} value={hackathon.id}>
                  {hackathon.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Project Count */}
      {projectCount !== undefined && (
        <span className="text-sm text-accent font-medium" aria-live="polite" aria-atomic="true">
          <span className="sr-only">Search results: </span>
          ({projectCount} {projectCount === 1 ? 'project' : 'projects'})
        </span>
      )}
    </div>
  )
}
