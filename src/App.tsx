import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import GetStarted from "./pages/GetStarted";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import Invest from "./pages/Invest";
import Market from "./pages/Market";
import Earn from "./pages/Earn";
import WalletProfile from "./pages/WalletProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/get-started" element={<GetStarted />} />
              <Route path="/home" element={<Home />} />
              <Route path="/invest" element={<Invest />} />
              <Route path="/market" element={<Market />} />
              <Route path="/earn" element={<Earn />} />
              <Route path="/wallet" element={<WalletProfile />} />
              {/* Legacy redirect */}
              <Route path="/dashboard" element={<Navigate to="/home" replace />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;