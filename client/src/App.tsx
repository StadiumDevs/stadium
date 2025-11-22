import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import M2ProgramPage from "./pages/M2ProgramPage";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";
import ProjectPage from "./pages/ProjectPage";
import SubmissionPage from "./pages/SubmissionPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import PastProjects from "./pages/PastProjects";
import WinnersPage from "./pages/WinnersPage";

// Redirect component for old project routes
const ProjectRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/m2-program/${id}`} replace />;
};

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const root = document.documentElement;

    // Remove any existing theme classes
    root.classList.remove("light", "dark");

    // Add current theme class
    root.classList.add("dark");

    // Store preference in localStorage
    localStorage.setItem("theme", "dark");

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        getComputedStyle(root).getPropertyValue("--background").trim()
      );
    }
  }, []);
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="past-projects" element={<PastProjects />} />
                <Route path="m2-program" element={<M2ProgramPage />} />
                <Route path="project-page" element={<ProjectPage />} />
                <Route path="submission" element={<SubmissionPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* Redirect old routes for backwards compatibility */}
                <Route path="projects" element={<Navigate to="/m2-program" replace />} />
              </Route>
              <Route path="m2-program/:id" element={<ProjectDetailsPage />} />
              <Route path="winners/:hackathon" element={<WinnersPage />} />
              {/* Redirect old project detail route */}
              <Route path="projects/:id" element={<ProjectRedirect />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
