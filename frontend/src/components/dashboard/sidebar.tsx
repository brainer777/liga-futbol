'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Trophy,
  Users,
  Shield,
  Calendar,
  DollarSign,
  FileText,
  LogOut,
  UserPlus,
  UserCog,
  KeyRound,
  ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/dashboard/categorias', label: 'Categorías', icon: Trophy },
  { href: '/dashboard/temporadas', label: 'Temporadas', icon: Calendar },
  { href: '/dashboard/clubes', label: 'Clubes', icon: Shield },
  { href: '/dashboard/equipos', label: 'Equipos', icon: Users },
  { href: '/dashboard/torneos', label: 'Torneos', icon: Trophy },
  { href: '/dashboard/inscripciones', label: 'Inscripciones', icon: FileText },
  { href: '/dashboard/jugadores', label: 'Jugadores', icon: UserPlus },
  { href: '/dashboard/pagos', label: 'Pagos', icon: DollarSign },
];

// Solo visible para roles administrativos (mismos que exige el backend).
const adminNavItems = [
  { href: '/dashboard/usuarios', label: 'Usuarios', icon: UserCog },
  { href: '/dashboard/roles', label: 'Roles', icon: KeyRound },
  { href: '/dashboard/auditoria', label: 'Auditoría', icon: ScrollText },
];

const ROLES_ADMIN = ['Superadministrador', 'Administrador de liga'];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const onLogout = () => {
    logout();
    router.push('/login');
  };

  const isAdmin = !!user?.roles.some((r) => ROLES_ADMIN.includes(r.nombre));

  const renderItem = (item: { href: string; label: string; icon: typeof LayoutDashboard }) => {
    const Icon = item.icon;
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-foreground',
        )}
      >
        <Icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
            ⚽
          </div>
          <div>
            <div className="font-bold leading-none">Liga de Fútbol</div>
            <div className="text-xs text-muted-foreground mt-1">Panel de gestión</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(renderItem)}

        {isAdmin && (
          <>
            <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Administración
            </div>
            {adminNavItems.map(renderItem)}
          </>
        )}
      </nav>

      <div className="p-3 border-t">
        <div className="px-3 py-2 text-sm">
          <div className="font-medium">{user?.nombre}</div>
          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {user?.roles.map((r) => (
              <span key={r.id} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                {r.nombre}
              </span>
            ))}
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start mt-2" onClick={onLogout}>
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
