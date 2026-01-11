import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';
import { ROUTES } from '@/constants';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface)]">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-[var(--color-primary-600)]">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-[var(--color-text-primary)]">
          Page Not Found
        </h2>
        <p className="mt-2 text-[var(--color-text-muted)]">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link to={ROUTES.HOME}>
            <Button>
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
