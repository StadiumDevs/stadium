import { Link, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Wrench, Clock, Home, Menu, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function Navigation() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/past-projects", label: "Past Projects", icon: Clock },
    { href: "/m2-program", label: "M2 Program", icon: Wrench },
    { href: "/admin", label: "Admin", icon: Shield },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="font-heading text-xl font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
            aria-label="Stadium - Go to home page"
          >
            Stadium
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href || 
                (item.href === "/m2-program" && location.pathname.startsWith("/m2-program/"))

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
                  <Link 
                    to={item.href}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </Button>
              )
            })}
          </div>

          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col gap-2 mt-8">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href || 
                    (item.href === "/m2-program" && location.pathname.startsWith("/m2-program/"))

                  return (
                    <Button
                      key={item.href}
                      variant={isActive ? "default" : "ghost"}
                      size="lg"
                      asChild
                      className={cn(
                        "w-full justify-start gap-2",
                        !isActive && "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link 
                        to={item.href}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        {item.label}
                      </Link>
                    </Button>
                  )
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
