import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  Home,
  ShoppingBag,
  ClipboardList,
  Bell,
  User,
  Bike,
  Store,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Package,
  TrendingUp,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { useUnreadNotifications } from "../../hooks/useUnreadNotifications";

const NAV_ITEMS: Record<
  string,
  { label: string; path: string; icon: React.ElementType }[]
> = {
  customer: [
    { label: "Home", path: "/customer", icon: Home },
    { label: "Book Pickup", path: "/customer/book", icon: ShoppingBag },
    { label: "My Orders", path: "/customer/orders", icon: ClipboardList },
    { label: "Notifications", path: "/customer/notifications", icon: Bell },
    { label: "Profile", path: "/customer/profile", icon: User },
  ],
  rider: [
    { label: "Dashboard", path: "/rider", icon: LayoutDashboard },
    { label: "My Orders", path: "/rider/orders", icon: Package },
    { label: "Earnings", path: "/rider/earnings", icon: TrendingUp },
    { label: "Profile", path: "/rider/profile", icon: User },
  ],
  shop_owner: [
    { label: "Dashboard", path: "/shop", icon: LayoutDashboard },
    { label: "Orders", path: "/shop/orders", icon: ClipboardList },
    { label: "Earnings", path: "/shop/earnings", icon: TrendingUp },
    { label: "Services", path: "/shop/services", icon: Store },
    { label: "Profile", path: "/shop/profile", icon: User },
  ],
  admin: [
    { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { label: "Users", path: "/admin/users", icon: Users },
    { label: "Shops", path: "/admin/shops", icon: Store },
    { label: "Riders", path: "/admin/riders", icon: Bike },
    { label: "Orders", path: "/admin/orders", icon: ClipboardList },
    { label: "Analytics", path: "/admin/analytics", icon: TrendingUp },
    { label: "Alerts", path: "/admin/alerts", icon: Bell },
    { label: "Settings", path: "/admin/settings", icon: Settings },
  ],
};

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  customer: { label: "Customer", color: "from-primary to-primary-light" },
  rider: { label: "Rider", color: "from-green-600 to-emerald-500" },
  shop_owner: { label: "Shop Owner", color: "from-purple-600 to-violet-500" },
  admin: { label: "Admin", color: "from-gray-800 to-gray-700" },
};

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const role = user?.role ?? "customer";
  const navItems = NAV_ITEMS[role] ?? [];
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.customer;
  const roots = ["/customer", "/rider", "/shop", "/admin"];
  const unreadCount = useUnreadNotifications();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={clsx(
          "fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-gray-100 shadow-elevated flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className={clsx("bg-gradient-to-r p-5", config.color)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🧺</span>
              <div>
                <p className="font-extrabold text-white text-lg leading-none">
                  LaundryLink
                </p>
                <p className="text-xs text-white/70 mt-0.5">
                  {config.label} Portal
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-white/80 hover:text-white p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {user && (
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {user.full_name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {user.full_name}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {navItems.map((item) => {
            const active =
              location.pathname === item.path ||
              (!roots.includes(item.path) &&
                location.pathname.startsWith(item.path));
            const isNotif = item.path.includes("notifications");
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  active
                    ? "bg-primary-50 text-primary"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <item.icon size={18} />
                <span className="flex-1">{item.label}</span>
                {/* Notification badge */}
                {isNotif && unreadCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {active && !isNotif && (
                  <ChevronRight size={14} className="text-primary" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={async () => {
              await signOut();
              navigate("/login");
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

export function DashboardLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-100 flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-20">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <Menu size={20} />
          </button>
          {title && (
            <h1 className="font-bold text-gray-900 text-base">{title}</h1>
          )}
          <div className="flex-1" />
          <div className="text-lg">🇵🇭</div>
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
