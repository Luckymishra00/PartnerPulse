import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Building2, ClipboardCheck, FileSignature, LayoutDashboard, LogOut, Menu, ShieldAlert, Truck, X } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { PulseMark } from './Pulse.jsx';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/suppliers', label: 'Suppliers', icon: Building2 },
  { to: '/contracts', label: 'Contracts', icon: FileSignature },
  { to: '/deliveries', label: 'Deliveries', icon: Truck },
  { to: '/evaluations', label: 'Reviews', icon: ClipboardCheck },
  { to: '/sla', label: 'SLA watch', icon: ShieldAlert },
  { to: '/reports', label: 'Analysis', icon: BarChart3 },
];

function Rail({ onNavigate }) {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-full flex-col bg-harbor-800 text-harbor-200">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <PulseMark />
        <span className="font-display text-[22px] font-bold leading-none tracking-tight text-white" style={{ fontVariationSettings: "'wdth' 86" }}>PartnerPulse</span>
      </div>
      <nav className="flex-1 px-3" aria-label="Main">
        <ul className="space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 rounded-[3px] px-3 py-2.5 text-[15px] font-semibold transition-colors ${isActive ? 'bg-harbor-700 text-white before:absolute before:inset-y-1.5 before:-left-3 before:w-[3px] before:rounded-r before:bg-[#7F93FF]' : 'hover:bg-harbor-700/60 hover:text-white'}`
                }
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-harbor-700 px-5 py-4">
        <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
        <p className="text-xs capitalize text-harbor-300">{user?.role}</p>
        <button onClick={logout} className="mt-3 flex items-center gap-2 text-sm font-semibold text-harbor-200 hover:text-white">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

export default function Shell() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen lg:pl-[236px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] lg:block">
        <Rail />
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between bg-harbor-800 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <PulseMark size={26} />
          <span className="font-display text-lg font-bold text-white">PartnerPulse</span>
        </div>
        <button className="rounded p-1.5 text-white" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-6 w-6" /></button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-harbor-900/50" onClick={() => setOpen(false)} />
          <div className="relative h-full w-[260px] animate-sheet">
            <button className="absolute right-3 top-4 z-10 text-white" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
            <Rail onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main key={pathname.split('/')[1]} className="mx-auto max-w-[1280px] px-4 py-7 sm:px-8 lg:px-10 lg:py-9">
        <Outlet />
      </main>
    </div>
  );
}
