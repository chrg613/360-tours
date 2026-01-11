import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '@/constants';

// Layouts
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';

// Auth Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';

// Dashboard Pages
import { DashboardPage } from '@/pages/dashboard/DashboardPage';

// Tour Pages
import { ToursPage } from '@/pages/tours/ToursPage';
import { TourCreatePage } from '@/pages/tours/TourCreatePage';
import { TourEditPage } from '@/pages/tours/TourEditPage';
import { TourViewPage } from '@/pages/tours/TourViewPage';
import { TourAnalyticsPage } from '@/pages/tours/TourAnalyticsPage';

// Settings Pages
import { ProfilePage } from '@/pages/settings/ProfilePage';
import { SettingsPage } from '@/pages/settings/SettingsPage';

// Public Pages
import { HomePage } from '@/pages/HomePage';
import { PublicTourPage } from '@/pages/PublicTourPage';
import { EmbedTourPage } from '@/pages/EmbedTourPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Auth guard component
import { ProtectedRoute } from '@/components/features/ProtectedRoute';

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
    ],
  },

  // Auth routes
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.REGISTER, element: <RegisterPage /> },
      { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
    ],
  },

  // Protected dashboard routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.DASHBOARD, element: <DashboardPage /> },
      { path: ROUTES.TOURS, element: <ToursPage /> },
      { path: ROUTES.TOUR_CREATE, element: <TourCreatePage /> },
      { path: ROUTES.TOUR_EDIT, element: <TourEditPage /> },
      { path: ROUTES.TOUR_VIEW, element: <TourViewPage /> },
      { path: ROUTES.TOUR_ANALYTICS, element: <TourAnalyticsPage /> },
      { path: ROUTES.PROFILE, element: <ProfilePage /> },
      { path: ROUTES.SETTINGS, element: <SettingsPage /> },
    ],
  },

  // Public tour viewing (no auth required)
  {
    path: ROUTES.PUBLIC_TOUR,
    element: <PublicTourPage />,
  },

  // Embedded tour (no chrome, just viewer)
  {
    path: ROUTES.EMBED_TOUR,
    element: <EmbedTourPage />,
  },

  // 404 fallback
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
