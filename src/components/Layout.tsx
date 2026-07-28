import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  ShoppingCartIcon,
  CubeIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  ArrowRightOnRectangleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';

const nav = [
  { to: '/', label: 'Dashboard', icon: HomeIcon },
  { to: '/sales', label: 'Sales', icon: ShoppingCartIcon },
  { to: '/products', label: 'Products', icon: CubeIcon },
  { to: '/customers', label: 'Customers', icon: UsersIcon },
  { to: '/reports', label: 'Reports', icon: DocumentChartBarIcon },
  { to: '/analytics', label: 'Analytics', icon: ChartBarIcon },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminNav = user?.role === 'ADMIN' ? [{ to: '/users', label: 'Users', icon: UserGroupIcon }] : [];

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold">Sales ERP</h1>
          <p className="text-slate-400 text-sm mt-1">Tracking System</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[...nav, ...adminNav].map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <div className="px-3 mb-3">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            <span className="inline-block mt-1 text-xs bg-slate-700 px-2 py-0.5 rounded">{user?.role}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
