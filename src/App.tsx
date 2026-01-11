import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from '@/lib/queryClient';
import { router } from '@/lib/router';
import { Toaster } from '@/components/ui/Toaster';
import { ErrorBoundary } from '@/components/features/ErrorBoundary';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { useUIStore } from '@/stores';

function ThemeInitializer() {
  const { theme } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  return null;
}

function AuthInitializer() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-primary-200)] border-t-[var(--color-primary-600)]" />
          <p className="text-[var(--color-text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ThemeInitializer />
        <AuthInitializer />
        <Toaster />
      </QueryProvider>
    </ErrorBoundary>
  );
}
