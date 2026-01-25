import { forwardRef } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export const ThemeToggle = forwardRef<HTMLButtonElement>((_, ref) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      ref={ref}
      onClick={toggleTheme}
      className={cn(
        "p-2 rounded-xl transition-all duration-300",
        "bg-muted hover:bg-muted/80",
        "border border-border"
      )}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-warning" />
      ) : (
        <Moon className="w-5 h-5 text-primary" />
      )}
    </button>
  );
});

ThemeToggle.displayName = 'ThemeToggle';
