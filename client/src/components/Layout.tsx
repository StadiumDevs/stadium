import { Link, Outlet, useLocation } from "react-router-dom";

const Layout = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Main Content */}
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8 mt-16">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Created by Sacha Lansky at {' '}
                <a
                  href="https://www.joinwebzero.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline transition-colors"
                >
                  WebZero
                </a>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                <a
                  href="https://luma.com/blockspace-symmetry"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline transition-colors"
                >
                  Blockspace Symmetry 2024
                </a>
                <span className="hidden sm:inline text-muted-foreground">•</span>
                  <a
                    href="https://luma.com/blockspacesynergy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline transition-colors"
                  >
                    Blockspace Synergy 2025
                  </a>
                  <span className="hidden sm:inline text-muted-foreground">•</span>
                  <a
                    href="https://luma.com/sub0hack"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline transition-colors"
                  >
                    sub0 Hack 2025
                  </a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="https://github.com/JoinWebZero/"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </Link>
              <Link
                to="https://x.com/JoinWebZero"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                X
              </Link>
              {/* <Link
                to="/submission"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Submit Project
              </Link> */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
