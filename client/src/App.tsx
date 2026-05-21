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
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";
import { useBrightness } from "@/hooks/use-brightness";
import WinnersPage from "./pages/WinnersPage";
import ProgramsPage from "./pages/ProgramsPage";
import ProgramDetailPage from "./pages/ProgramDetailPage";
import AdminProgramPage from "./pages/AdminProgramPage";
import AppAdminsPage from "./pages/AppAdminsPage";

// Redirect component for old project routes
const ProjectRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/m2-program/${id}`} replace />;
};

const queryClient = new QueryClient();

const App = () => {
  // Drives the grayscale brightness palette (auto-tracks local time-of-day).
  useBrightness();

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
                <Route path="m2-program" element={<M2ProgramPage />} />
                <Route path="programs" element={<ProgramsPage />} />
                {/* Redirect old past-projects route to homepage */}
                <Route path="past-projects" element={<Navigate to="/" replace />} />
                <Route path="admin" element={<AdminPage />} />
                {/* Redirect old routes for backwards compatibility */}
                <Route path="projects" element={<Navigate to="/m2-program" replace />} />
              </Route>
              <Route path="m2-program/:id" element={<ProjectDetailsPage />} />
              <Route path="programs/:slug" element={<ProgramDetailPage />} />
              <Route path="admin/programs/:slug" element={<AdminProgramPage />} />
              <Route path="admin/app-admins" element={<AppAdminsPage />} />
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
