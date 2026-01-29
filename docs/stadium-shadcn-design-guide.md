# Stadium Webapp Design Guide v2.0
**shadcn/ui Implementation with web3 minimalist, privacy and cipherpunk Aesthetic**

---

## 🎯 Why shadcn/ui?

✅ **Better Developer Experience** - Pre-built, customizable components
✅ **Accessibility Built-in** - WCAG compliant out of the box
✅ **Easy Theming** - CSS variables and Tailwind integration
✅ **Copy-Paste Ready** - No package bloat, full control
✅ **Animation Support** - Built-in transitions with Framer Motion

---

## 🚀 Initial Setup

### 1. Install shadcn/ui (if not already done)
```bash
npx shadcn-ui@latest init
```

**Configuration answers:**
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**
- Tailwind config: **Yes**
- Components directory: **@/components**
- Utils directory: **@/lib/utils**

### 2. Install Required Components
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add input
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add collapsible
npx shadcn-ui@latest add select
npx shadcn-ui@latest add carousel
npx shadcn-ui@latest add command
```

### 3. Install Additional Dependencies
```bash
npm install framer-motion class-variance-authority clsx tailwind-merge
npm install lucide-react  # For icons
```

---

## 🎨 Theme Configuration

### Update `app/globals.css` or `styles/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Background Colors */
    --background: 240 10% 4%;        /* #0A0A0A - Main background */
    --foreground: 0 0% 100%;         /* #FFFFFF - Primary text */
    
    /* Card Colors */
    --card: 240 6% 8%;               /* #141414 - Card backgrounds */
    --card-foreground: 0 0% 100%;    /* #FFFFFF - Card text */
    
    /* Popover Colors */
    --popover: 240 7% 10%;           /* #1A1A1A - Elevated surfaces */
    --popover-foreground: 0 0% 100%; /* #FFFFFF - Popover text */
    
    /* Primary (Purple) */
    --primary: 271 81% 56%;          /* #9333EA - Main purple */
    --primary-foreground: 0 0% 100%; /* #FFFFFF - Text on purple */
    
    /* Secondary */
    --secondary: 240 5% 16%;         /* #2A2A2A - Secondary surfaces */
    --secondary-foreground: 0 0% 100%; /* #FFFFFF - Secondary text */
    
    /* Muted */
    --muted: 240 5% 16%;             /* #2A2A2A - Muted backgrounds */
    --muted-foreground: 0 0% 64%;    /* #A3A3A3 - Muted text */
    
    /* Accent (Light Purple) */
    --accent: 270 70% 74%;           /* #C084FC - Accent purple */
    --accent-foreground: 271 81% 56%; /* #9333EA - Text on accent */
    
    /* Destructive (Keep minimal, not used much) */
    --destructive: 0 84% 60%;        /* Red for errors */
    --destructive-foreground: 0 0% 100%;
    
    /* Border Colors */
    --border: 240 5% 23%;            /* #3A3A3A - Default borders */
    --input: 240 5% 23%;             /* #3A3A3A - Input borders */
    --ring: 271 81% 56%;             /* #9333EA - Focus rings */
    
    /* Chart Colors (if needed) */
    --chart-1: 271 81% 56%;          /* Purple */
    --chart-2: 270 70% 74%;          /* Light purple */
    --chart-3: 280 60% 60%;          /* Purple variant */
    --chart-4: 262 83% 58%;          /* Purple variant */
    --chart-5: 278 75% 65%;          /* Purple variant */
    
    /* Radius */
    --radius: 0.75rem;               /* 12px default border radius */
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* Custom Classes for Stadium */
@layer components {
  .text-secondary {
    @apply text-muted-foreground;
  }
  
  .text-tertiary {
    @apply text-muted-foreground/60;
  }
  
  .bg-tertiary {
    @apply bg-secondary/50;
  }
  
  .border-subtle {
    @apply border-border/50;
  }
  
  .purple-glow {
    box-shadow: 0 4px 24px hsl(var(--primary) / 0.3);
  }
  
  .purple-glow-strong {
    box-shadow: 0 8px 32px hsl(var(--primary) / 0.4),
                0 0 0 1px hsl(var(--primary) / 0.2);
  }
  
  .glass-panel {
    @apply bg-popover/60 backdrop-blur-xl border-border/50;
  }
}
```

### Update `tailwind.config.js` or `tailwind.config.ts`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'JetBrains Mono', 'monospace'],
        heading: ['Space Mono', 'monospace'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

---

## 📦 Custom Components

### 1. Project Card Component

**File: `components/project-card.tsx`**

```typescript
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Github, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectCardProps {
  title: string
  author: string
  description: string
  track: string
  isWinner?: boolean
  demoUrl?: string
  githubUrl?: string
  projectUrl?: string
  className?: string
  onClick?: () => void
}

export function ProjectCard({
  title,
  author,
  description,
  track,
  isWinner = false,
  demoUrl,
  githubUrl,
  projectUrl,
  className,
  onClick,
}: ProjectCardProps) {
  return (
    <Card
      className={cn(
        "group relative cursor-pointer transition-all duration-300 hover:border-primary hover:-translate-y-1",
        isWinner && "border-yellow-500 border-2",
        className
      )}
      onClick={onClick}
    >
      {isWinner && (
        <>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-primary" />
          <div className="absolute top-4 right-4 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
            <Trophy className="w-5 h-5 text-black" />
          </div>
        </>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground mb-1 line-clamp-1">
              {title}
            </h3>
            <p className="text-sm font-medium text-accent">By {author}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {description}
        </p>
      </CardContent>

      <CardFooter className="pt-3 border-t border-subtle flex justify-between items-center">
        <Badge
          variant="outline"
          className="bg-primary/10 border-primary text-accent"
        >
          {track}
        </Badge>

        <div className="flex gap-2">
          {demoUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-secondary hover:text-accent"
              onClick={(e) => {
                e.stopPropagation()
                window.open(demoUrl, "_blank")
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          {githubUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-secondary hover:text-accent"
              onClick={(e) => {
                e.stopPropagation()
                window.open(githubUrl, "_blank")
              }}
            >
              <Github className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
```

### 2. Project Detail Modal

**File: `components/project-detail-modal.tsx`**

```typescript
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ExternalLink, Github, Trophy } from "lucide-react"

interface ProjectDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: {
    title: string
    author: string
    description: string
    longDescription?: string
    track: string
    isWinner?: boolean
    demoUrl?: string
    githubUrl?: string
    projectUrl?: string
  }
}

export function ProjectDetailModal({
  open,
  onOpenChange,
  project,
}: ProjectDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold mb-2">
                {project.title}
              </DialogTitle>
              <DialogDescription className="text-base text-accent">
                By {project.author}
              </DialogDescription>
            </div>
            {project.isWinner && (
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-black" />
              </div>
            )}
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Track
            </h4>
            <Badge
              variant="outline"
              className="bg-primary/10 border-primary text-accent"
            >
              {project.track}
            </Badge>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Description
            </h4>
            <p className="text-foreground leading-relaxed">
              {project.longDescription || project.description}
            </p>
          </div>

          <Separator />

          <div className="flex gap-3">
            {project.demoUrl && (
              <Button
                className="flex-1"
                onClick={() => window.open(project.demoUrl, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Demo
              </Button>
            )}
            {project.projectUrl && (
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => window.open(project.projectUrl, "_blank")}
              >
                Project Page
              </Button>
            )}
            {project.githubUrl && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(project.githubUrl, "_blank")}
              >
                <Github className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### 3. Filter Sidebar

**File: `components/filter-sidebar.tsx`**

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Gamepad2, Coins, Image, Wrench, Users, Layers } from "lucide-react"
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
    { id: "other", label: "Other", icon: <Layers className="w-4 h-4" /> },
  ],
}

interface FilterSidebarProps {
  activeFilters: string[]
  onFilterChange: (filterId: string) => void
  onClearFilters: () => void
  showWinnersOnly: boolean
  onWinnersOnlyChange: (value: boolean) => void
}

export function FilterSidebar({
  activeFilters,
  onFilterChange,
  onClearFilters,
  showWinnersOnly,
  onWinnersOnlyChange,
}: FilterSidebarProps) {
  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle className="text-base">Filters</CardTitle>
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
              "w-full justify-start",
              showWinnersOnly && "bg-yellow-500/10 border-yellow-500 text-yellow-500 hover:bg-yellow-500/20"
            )}
            onClick={() => onWinnersOnlyChange(!showWinnersOnly)}
          >
            <Trophy className="w-4 h-4 mr-2" />
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
                  "w-full justify-start",
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
```

### 4. Navigation Bar

**File: `components/navigation.tsx`**

```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Folder, Clock, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/active-projects", label: "Active Projects", icon: Folder },
    { href: "/past-projects", label: "Past Projects", icon: Clock },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo - could be an image or text */}
          <Link href="/" className="font-heading text-xl font-bold">
            Stadium
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Button
                  key={item.href}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  asChild
                  className={cn(
                    "gap-2",
                    !isActive && "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Link href={item.href}>
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
```

### 5. Project Carousel

**File: `components/project-carousel.tsx`**

```typescript
"use client"

import { useState } from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, ExternalLink } from "lucide-react"

interface Project {
  id: string
  title: string
  author: string
  description: string
  track: string
  isWinner: boolean
  demoUrl?: string
  projectUrl?: string
}

interface ProjectCarouselProps {
  projects: Project[]
  onProjectClick?: (project: Project) => void
}

export function ProjectCarousel({ projects, onProjectClick }: ProjectCarouselProps) {
  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      className="w-full"
    >
      <CarouselContent className="-ml-4">
        {projects.map((project) => (
          <CarouselItem key={project.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
            <Card
              className="h-full cursor-pointer transition-all duration-300 hover:border-primary"
              onClick={() => onProjectClick?.(project)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Badge
                      variant="outline"
                      className="mb-2 bg-yellow-500/10 border-yellow-500 text-yellow-500"
                    >
                      <Trophy className="w-3 h-3 mr-1" />
                      Winner
                    </Badge>
                    <h3 className="text-lg font-bold line-clamp-1">{project.title}</h3>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pb-3">
                <p className="text-sm text-accent font-medium mb-2">
                  {project.author}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              </CardContent>

              <CardFooter className="pt-3 border-t border-subtle flex justify-between">
                <Badge variant="outline" className="bg-primary/10 border-primary text-accent">
                  {project.track}
                </Badge>

                <div className="flex gap-2">
                  {project.demoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(project.demoUrl, "_blank")
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View Demo
                    </Button>
                  )}
                  {project.projectUrl && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(project.projectUrl, "_blank")
                      }}
                    >
                      Project Page
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden md:flex" />
      <CarouselNext className="hidden md:flex" />
    </Carousel>
  )
}
```

### 6. Search Bar with Dropdown

**File: `components/search-bar.tsx`**

```typescript
"use client"

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
}

export function SearchBar({
  onSearchChange,
  onHackathonChange,
  hackathons,
  projectCount,
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
      <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              onSearchChange(e.target.value)
            }}
            className="pl-10"
          />
        </div>

        {/* Hackathon Dropdown */}
        <div className="flex items-center gap-2 sm:min-w-[240px]">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Hackathon:
          </span>
          <Select onValueChange={onHackathonChange} defaultValue="all">
            <SelectTrigger>
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
        <span className="text-sm text-accent font-medium">
          ({projectCount} projects)
        </span>
      )}
    </div>
  )
}
```

---

## 📄 Page Examples

### Home Page

**File: `app/page.tsx`**

```typescript
"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { ProjectCarousel } from "@/components/project-carousel"
import { ProjectDetailModal } from "@/components/project-detail-modal"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const [selectedProject, setSelectedProject] = useState(null)

  // Mock data - replace with your actual data
  const winnerProjects = [
    {
      id: "1",
      title: "Monsters Ink!",
      author: "Blockspace Synergy 2025",
      description: "Create an adorable creature by learning Polkadot and Ink.",
      track: "ink!",
      isWinner: true,
      demoUrl: "#",
      projectUrl: "#",
    },
    // Add more winners...
  ]

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold">
            Blockspace Stadium
          </h1>
          <p className="text-xl text-muted-foreground">
            The ultimate hacker's project progress and showcase portal.
          </p>
        </div>
      </section>

      {/* Featured Winners Carousel */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <h2 className="font-heading text-3xl font-bold mb-2">
            🏆 Featured Winners
          </h2>
          <p className="text-muted-foreground">
            Congratulations to our recent hackathon winners!
          </p>
        </div>

        <ProjectCarousel
          projects={winnerProjects}
          onProjectClick={setSelectedProject}
        />
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Button size="lg" className="gap-2" asChild>
          <Link href="/past-projects">
            View All Past Projects
            <ArrowRight className="w-5 h-5" />
          </Link>
        </Button>
      </section>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          open={!!selectedProject}
          onOpenChange={(open) => !open && setSelectedProject(null)}
          project={selectedProject}
        />
      )}
    </div>
  )
}
```

### Past Projects Page

**File: `app/past-projects/page.tsx`**

```typescript
"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { FilterSidebar } from "@/components/filter-sidebar"
import { SearchBar } from "@/components/search-bar"
import { ProjectCard } from "@/components/project-card"
import { ProjectDetailModal } from "@/components/project-detail-modal"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

export default function PastProjectsPage() {
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [showWinnersOnly, setShowWinnersOnly] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedHackathon, setSelectedHackathon] = useState("all")

  // Mock data
  const projects = [
    {
      id: "1",
      title: "QSTN",
      author: "Orrin Campbell",
      description: "QSTN is a self-service AI-powered survey marketplace that allows businesses to fund surveys using Solana.",
      track: "Solana",
      isWinner: false,
      demoUrl: "#",
      githubUrl: "#",
    },
    // Add more projects...
  ]

  const hackathons = [
    { id: "synergy-2025", name: "Blockspace Synergy 2025" },
    { id: "symmetry-2024", name: "Blockspace Symmetry 2024" },
  ]

  const handleFilterChange = (filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId]
    )
  }

  const handleClearFilters = () => {
    setActiveFilters([])
    setShowWinnersOnly(false)
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Page Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
            <Link href="/">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Go Back Home
            </Link>
          </Button>

          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Past Projects
          </h1>

          <SearchBar
            onSearchChange={setSearchQuery}
            onHackathonChange={setSelectedHackathon}
            hackathons={hackathons}
            projectCount={projects.length}
          />
        </div>

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <FilterSidebar
              activeFilters={activeFilters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              showWinnersOnly={showWinnersOnly}
              onWinnersOnlyChange={setShowWinnersOnly}
            />
          </aside>

          {/* Projects Grid */}
          <main className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  {...project}
                  onClick={() => setSelectedProject(project)}
                />
              ))}
            </div>
          </main>
        </div>
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          open={!!selectedProject}
          onOpenChange={(open) => !open && setSelectedProject(null)}
          project={selectedProject}
        />
      )}
    </div>
  )
}
```

### Winners Page

**File: `app/winners/[hackathon]/page.tsx`**

```typescript
"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { ProjectCard } from "@/components/project-card"
import { ProjectDetailModal } from "@/components/project-detail-modal"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

export default function WinnersPage() {
  const [selectedProject, setSelectedProject] = useState(null)

  // Mock data
  const winners = [
    {
      id: "1",
      title: "Monsters Ink!",
      author: "Team Name",
      description: "Create an adorable creature by learning Polkadot and Ink.",
      track: "Polkadot Main Track",
      isWinner: true,
      demoUrl: "#",
      projectUrl: "#",
    },
    // Add more winners...
  ]

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Page Header */}
        <div className="mb-12">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
            <Link href="/">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Go Back Home
            </Link>
          </Button>

          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-2">
            Synergy 2025 Winners
          </h1>
          <p className="text-accent text-lg">
            Congratulations to the winners of the Blockspace Synergy Hackathon 2025!
          </p>
        </div>

        {/* Winners Section */}
        <section>
          <h2 className="font-heading text-2xl font-bold mb-6 flex items-center gap-2">
            <span>🏆</span>
            <span>Winners</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {winners.map((project) => (
              <ProjectCard
                key={project.id}
                {...project}
                onClick={() => setSelectedProject(project)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          open={!!selectedProject}
          onOpenChange={(open) => !open && setSelectedProject(null)}
          project={selectedProject}
        />
      )}
    </div>
  )
}
```

---

## 🎨 Custom Styling Tips

### Override shadcn Component Styles

You can customize shadcn components further by adding classes:

```typescript
// More rounded cards
<Card className="rounded-2xl">

// Stronger borders
<Card className="border-2">

// Custom hover effects
<Card className="hover:purple-glow">

// Glassmorphism
<Card className="glass-panel">
```

### Adding Custom Variants to Buttons

**Update: `components/ui/button.tsx`**

```typescript
const buttonVariants = cva(
  // ... existing base styles
  {
    variants: {
      variant: {
        // ... existing variants
        purple: "bg-primary text-primary-foreground hover:bg-primary/90",
        winner: "bg-yellow-500 text-black hover:bg-yellow-600",
      },
    },
  }
)
```

---

## 📱 Responsive Behavior

shadcn/ui components are responsive by default. Additional tweaks:

```typescript
// Hide on mobile, show on desktop
<div className="hidden lg:block">

// Different grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Responsive text sizes
<h1 className="text-3xl md:text-4xl lg:text-5xl">

// Responsive padding
<div className="p-4 md:p-6 lg:p-8">
```

---

## 🚀 Migration Checklist

### From V1 to shadcn/ui:

- [ ] Install shadcn/ui and required components
- [ ] Update `globals.css` with purple theme variables
- [ ] Update `tailwind.config` with extended colors and fonts
- [ ] Create custom components (ProjectCard, Navigation, etc.)
- [ ] Update page layouts to use new components
- [ ] Replace all green colors with purple variants
- [ ] Test responsive behavior on all screen sizes
- [ ] Test accessibility (keyboard navigation, screen readers)
- [ ] Add loading states with skeleton components
- [ ] Implement error boundaries

---

## 🎯 Quick Start Command for Cursor

```
I want to migrate my Stadium webapp to use shadcn/ui with a purple-themed design inspired by web3 minimalist, privacy and cipherpunk aesthetics. Please:

1. Set up shadcn/ui with the theme configuration from stadium-design-guide.md
2. Install all required shadcn components listed in the guide
3. Create the custom components: ProjectCard, FilterSidebar, Navigation, ProjectCarousel, SearchBar, and ProjectDetailModal
4. Update the home page to use the new components
5. Ensure all green colors are replaced with purple variants (#9333EA)
6. Use Space Mono font for headings and Inter for body text
7. Maintain all existing functionality while improving the UI

Start with setting up the theme and installing components, then move to creating custom components.
```

---

## 📚 Additional Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives) (used by shadcn/ui)
- [Lucide Icons](https://lucide.dev) (recommended icon library)

---

**End of shadcn/ui Design Guide**
*Version 2.0 - Stadium Webapp with web3 minimalist, privacy and cipherpunk Aesthetic*