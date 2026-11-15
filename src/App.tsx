import { lazy, Suspense } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { RequireAuth } from './components/RequireAuth';

const Index = lazy(() => import('./pages/Index'));
const Auth = lazy(() => import('./pages/Auth'));
const SignIn = lazy(() => import('./pages/SignIn'));
const SignUp = lazy(() => import('./pages/SignUp'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const GetStarted = lazy(() => import('./pages/GetStarted'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Home = lazy(() => import('./pages/Home'));
const Market = lazy(() => import('./pages/Market'));
const Cards = lazy(() => import('./pages/Cards'));
const WalletProfile = lazy(() => import('./pages/WalletProfile'));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-[100svh] items-center justify-center bg-background px-6" role="status" aria-live="polite">
    <div className="w-full max-w-sm space-y-3">
      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      <div className="h-28 rounded-2xl bg-muted/70" />
      <div className="h-12 rounded-xl bg-muted/50" />
      <span className="sr-only">Loading page…</span>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/sign-in" element={<SignIn />} />
                  <Route path="/sign-up" element={<SignUp />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/get-started" element={<GetStarted />} />
                  <Route path="/onboarding" element={<Navigate to="/market" replace />} />
                  <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
                  <Route path="/market" element={<RequireAuth><Market /></RequireAuth>} />
                  <Route path="/cards" element={<RequireAuth><Cards /></RequireAuth>} />
                  <Route path="/wallet" element={<RequireAuth><WalletProfile /></RequireAuth>} />
                  <Route path="/invest" element={<Navigate to="/market" replace />} />
                  <Route path="/investments" element={<Navigate to="/cards" replace />} />
                  <Route path="/earn" element={<Navigate to="/market" replace />} />
                  <Route path="/payments" element={<Navigate to="/wallet" replace />} />
                  <Route path="/mine" element={<Navigate to="/market" replace />} />
                  <Route path="/rewards" element={<Navigate to="/market" replace />} />
                  <Route path="/dashboard" element={<Navigate to="/home" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </NotificationProvider>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
