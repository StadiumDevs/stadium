import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailsPage from "./pages/ProjectDetailsPage";
import ProjectPage from "./pages/ProjectPage";
import SubmissionPage from "./pages/SubmissionPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import PastProjects from "./pages/PastProjects";
import WinnersPage from "./pages/WinnersPage";

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
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="project-page" element={<ProjectPage />} />
                <Route path="submission" element={<SubmissionPage />} />
                <Route path="admin" element={<AdminPage />} />
              </Route>
              <Route path="projects/:id" element={<ProjectDetailsPage />} />
              <Route path="winners/:hackathon" element={<WinnersPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
