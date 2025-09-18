import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Code,
  FolderOpen,
  PlusCircle,
  Shield,
  Trophy,
  Menu,
  History,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();

  const isActive = (path) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm shadow-elegant">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
        >
          <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Code className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Blockspace Stadium
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-2">
                      {[
              { to: "/", label: "Home" },
              { to: "/projects", label: "Active Projects", icon: FolderOpen },
              { to: "/past-projects", label: "Past Projects", icon: History },
              // { to: "/submission", label: "Submit", icon: PlusCircle },
              // { to: "/admin", label: "Admin", icon: Shield },
            ].map(({ to, label, icon: Icon }) => (
            <Button
              key={to} 
              variant={isActive(to) ? "default" : "ghost"}
              size="sm"
              asChild
              className={isActive(to) ? "bg-atariGreen text-black hover:bg-atariGreen/90" : ""}
            >
              <Link to={to} className="flex items-center space-x-2">
                {Icon && <Icon className="h-4 w-4" />}
                <span>{label}</span>
              </Link>
            </Button>
          ))}
        </nav>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-card/95 shadow-inner">
          <div className="flex flex-col space-y-1 p-4">
            {[
              { to: "/", label: "Home", icon: Trophy },
              { to: "/past-projects", label: "Past Projects", icon: History },
              { to: "/projects", label: "Active Projects", icon: FolderOpen },
              // { to: "/submission", label: "Submit", icon: PlusCircle },
              // { to: "/admin", label: "Admin", icon: Shield },
            ].map(({ to, label, icon: Icon }) => (
              <Button
                key={to}
                variant={isActive(to) ? "default" : "ghost"}
                size="sm"
                asChild
                onClick={() => setMobileMenuOpen(false)}
                className={isActive(to) ? "bg-atariGreen text-black hover:bg-atariGreen/90" : ""}
              >
                <Link to={to} className="flex items-center space-x-1">
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
