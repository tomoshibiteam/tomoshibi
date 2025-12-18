import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import GameplayLayout from "./components/layout/GameplayLayout";
import Home from "./pages/Home";
import Quests from "./pages/Quests";
import MapPage from "./pages/MapPage";
import ProfileHome from "./pages/ProfileHome";
import ProfileEdit from "./pages/ProfileEdit";
import RankHierarchy from "./pages/RankHierarchy";
import Cases from "./pages/Cases";
import EventDetail from "./pages/EventDetail";
import GamePlay from "./pages/GamePlay";
import Investigation from "./pages/Investigation";
import Tools from "./pages/Tools";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/AdminDashboard";
import Setup from "./pages/Setup";
import Install from "./pages/Install";
import Settings from "./pages/Settings";
import FriendManagement from "./pages/FriendManagement";
import Buddies from "./pages/Buddies";
import NotFound from "./pages/NotFound";
import LanguageOnboarding from "./pages/LanguageOnboarding";
import QuestDetail from "./pages/QuestDetail";

const queryClient = new QueryClient();
const basename = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={basename}>
        <Routes>
          {/* Language onboarding (first launch) */}
          <Route path="/onboarding" element={<LanguageOnboarding />} />

          {/* Full-screen gameplay route with phone frame but no header/nav */}
          <Route path="/gameplay/:eventId" element={<GameplayLayout><GamePlay /></GameplayLayout>} />

          {/* Standard routes with AppLayout */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/quests" element={<Quests />} />
            <Route path="/quest" element={<Quests />} />
            <Route path="/quest/:id" element={<QuestDetail />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/profile" element={<ProfileHome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile/edit" element={<ProfileEdit />} />
            <Route path="/rank-hierarchy" element={<RankHierarchy />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/:id" element={<EventDetail />} />
            <Route path="/investigation" element={<Investigation />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/buddies" element={<Buddies />} />
            <Route path="/friend-management" element={<FriendManagement />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/install" element={<Install />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
