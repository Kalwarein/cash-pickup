import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="glass-card relative z-10 w-full max-w-sm p-8 text-center">
        <p className="text-gradient font-display text-6xl font-bold tracking-tight">404</p>
        <p className="mb-6 mt-3 text-base text-muted-foreground">This page could not be found.</p>
        <a
          href="/"
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl gradient-primary font-semibold text-primary-foreground shadow-float transition-all hover:brightness-110 active:scale-[0.98]"
        >
          Return Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
