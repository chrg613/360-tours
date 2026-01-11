import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/stores';
import { cn } from '@/utils';

export function DashboardLayout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="flex min-h-screen bg-[var(--color-surface)]">
      <Sidebar />
      <div
        className={cn(
          'flex flex-1 flex-col transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'
        )}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
