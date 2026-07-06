import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import GetStarted from "./pages/GetStarted";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import Invest from "./pages/Invest";
import Market from "./pages/Market";
import WalletProfile from "./pages/WalletProfile";
import Payments from "./pages/Payments";
import Mine from "./pages/Mine";
import Settings from "./pages/Settings";
import Deposit from "./pages/wallet/Deposit";
import Withdraw from "./pages/wallet/Withdraw";
import Transfer from "./pages/wallet/Transfer";
import History from "./pages/wallet/History";
import PromoCenter from "./pages/wallet/PromoCenter";
import Analytics from "./pages/wallet/Analytics";
import { RequireAuth } from "./components/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <NotificationProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/get-started" element={<GetStarted />} />
              <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
              <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
              <Route path="/invest" element={<RequireAuth><Invest /></RequireAuth>} />
              <Route path="/market" element={<RequireAuth><Market /></RequireAuth>} />
              <Route path="/mine" element={<RequireAuth><Mine /></RequireAuth>} />
              <Route path="/wallet" element={<RequireAuth><WalletProfile /></RequireAuth>} />
              <Route path="/wallet/deposit" element={<RequireAuth><Deposit /></RequireAuth>} />
              <Route path="/wallet/withdraw" element={<RequireAuth><Withdraw /></RequireAuth>} />
              <Route path="/wallet/transfer" element={<RequireAuth><Transfer /></RequireAuth>} />
              <Route path="/wallet/history" element={<RequireAuth><History /></RequireAuth>} />
              <Route path="/wallet/promo" element={<RequireAuth><PromoCenter /></RequireAuth>} />
              <Route path="/wallet/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
              <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
              <Route path="/payments" element={<RequireAuth><Payments /></RequireAuth>} />
              {/* Legacy redirects */}
              <Route path="/earn" element={<Navigate to="/mine" replace />} />
              <Route path="/rewards" element={<Navigate to="/mine" replace />} />
              <Route path="/dashboard" element={<Navigate to="/home" replace />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </NotificationProvider>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
