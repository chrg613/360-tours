import { Link, useNavigate } from 'react-router-dom';
import {
  Settings,
  Bell,
  Search,
  Plus,
  Menu,
  LogOut,
  User,
  Moon,
  Sun,
  ChevronDown,
} from 'lucide-react';
import { Button, Avatar } from '@/components/ui';
import { useAuthStore, useUIStore } from '@/stores';
import { ROUTES } from '@/constants';

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, toggleSidebar, setSidebarMobileOpen } = useUIStore();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 lg:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setSidebarMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop Sidebar Toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden lg:flex"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search tours..."
            className="h-9 w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Create Tour Button */}
        <Button
          size="sm"
          onClick={() => navigate(ROUTES.TOUR_CREATE)}
          className="hidden sm:flex"
        >
          <Plus className="h-4 w-4" />
          New Tour
        </Button>

        {/* Theme Toggle */}
        <Button variant="ghost" size="icon-sm" onClick={toggleTheme}>
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon-sm" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--color-error-500)]" />
        </Button>

        {/* User Menu */}
        <div className="group relative">
          <button className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-[var(--color-surface)]">
            <Avatar
              src={user?.profile_image_url}
              name={user?.full_name || user?.email || ''}
              size="sm"
            />
            <span className="hidden text-sm font-medium lg:block">
              {user?.full_name || user?.email?.split('@')[0] || 'User'}
            </span>
            <ChevronDown className="hidden h-4 w-4 text-[var(--color-text-muted)] lg:block" />
          </button>

          {/* Dropdown Menu */}
          <div className="invisible absolute right-0 top-full mt-1 w-48 origin-top-right scale-95 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:scale-100 group-hover:opacity-100">
            <Link
              to={ROUTES.PROFILE}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--color-surface)]"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <Link
              to={ROUTES.SETTINGS}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--color-surface)]"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <hr className="my-1 border-[var(--color-border)]" />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-error-600)] hover:bg-[var(--color-error-50)]"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
