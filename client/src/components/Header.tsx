import { useState, useEffect } from "react";
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
  Wallet,
  Copy,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { web3Enable, web3Accounts } from '@polkadot/extension-dapp';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const { toast } = useToast();

  const isActive = (path) => pathname === path;

  // Check for connected wallet on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const extensions = await web3Enable('Blockspace Stadium');
        if (extensions.length > 0) {
          const accounts = await web3Accounts();
          if (accounts.length > 0) {
            setConnectedAddress(accounts[0].address);
          }
        }
      } catch (error) {
        console.error('Failed to check wallet connection:', error);
      }
    };
    checkConnection();
  }, []);

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const handleConnect = async () => {
    try {
      const extensions = await web3Enable('Blockspace Stadium');
      if (extensions.length === 0) {
        toast({
          title: "No wallet extension found",
          description: "Please install Polkadot.js or Talisman extension",
          variant: "destructive",
        });
        return;
      }
      
      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        toast({
          title: "No accounts found",
          description: "Please create an account in your wallet extension",
          variant: "destructive",
        });
        return;
      }
      
      setConnectedAddress(accounts[0].address);
      toast({
        title: "Wallet connected",
        description: `Connected to ${truncateAddress(accounts[0].address)}`,
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopyAddress = async () => {
    if (!connectedAddress) return;
    try {
      await navigator.clipboard.writeText(connectedAddress);
      toast({
        title: "Copied!",
        description: "Address copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy address",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    setConnectedAddress(null);
    toast({
      title: "Disconnected",
      description: "Wallet disconnected successfully",
    });
  };

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
              className={isActive(to) ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
            >
              <Link to={to} className="flex items-center space-x-2">
                {Icon && <Icon className="h-4 w-4" />}
                <span>{label}</span>
              </Link>
            </Button>
          ))}

          {/* Wallet Connection - Desktop */}
          {connectedAddress ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-mono text-sm">{truncateAddress(connectedAddress)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">Connected Wallet</p>
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      {connectedAddress}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCopyAddress}>
                  <Copy className="mr-2 h-4 w-4" />
                  <span>Copy Address</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDisconnect}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Disconnect</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={handleConnect} className="gap-2">
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          )}
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
                className={isActive(to) ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
              >
                <Link to={to} className="flex items-center space-x-1">
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              </Button>
            ))}
            
            {/* Wallet Connection - Mobile */}
            {connectedAddress ? (
              <>
                <div className="pt-2 pb-2 border-t">
                  <div className="flex items-center gap-2 px-2 py-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="font-mono text-xs">{truncateAddress(connectedAddress)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyAddress}
                  className="justify-start"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Address
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  className="justify-start"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                onClick={handleConnect}
                size="sm"
                className="mt-2 w-full gap-2"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
