import React, { useEffect, useState } from "react";
import supabase from "../../services/supabase";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { StatCard } from "../../components/common/Cards";
import {
  Card,
  PageSpinner,
  SectionHeader,
  StatusBadge,
} from "../../components/ui";
import { APP_CONFIG } from "../../constants";
import { Order } from "../../types";
import clsx from "clsx";

export function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    activeRiders: 0,
    openShops: 0,
    totalUsers: 0,
    pendingVerifications: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const go = (p: string) => {
    window.location.href = p;
  };

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().split("T")[0];
      const [
        { count: tot },
        { count: tod },
        { data: rev },
        { count: ar },
        { count: os },
        { count: tu },
        { count: ps },
        { count: pr },
      ] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today),
        supabase
          .from("orders")
          .select("total_amount")
          .eq("status", "delivered"),
        supabase
          .from("rider_profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "online"),
        supabase
          .from("shop_profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_open", true),
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase
          .from("shop_profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_verified", false),
        supabase
          .from("rider_profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_kyc_verified", false),
      ]);
      setStats({
        totalOrders: tot ?? 0,
        todayOrders: tod ?? 0,
        totalRevenue: (rev ?? []).reduce(
          (s: number, o: any) => s + o.total_amount,
          0,
        ),
        activeRiders: ar ?? 0,
        openShops: os ?? 0,
        totalUsers: tu ?? 0,
        pendingVerifications: (ps ?? 0) + (pr ?? 0),
      });
      const { data } = await supabase
        .from("orders")
        .select("*, customer:users(full_name), shop:shop_profiles(shop_name)")
        .order("created_at", { ascending: false })
        .limit(8);
      setOrders(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading)
    return (
      <DashboardLayout>
        <PageSpinner />
      </DashboardLayout>
    );

  const STAT_CARDS = [
    {
      emoji: "📦",
      label: "Today's Orders",
      value: stats.todayOrders,
      color: "bg-blue-50",
    },
    {
      emoji: "💰",
      label: "Total Revenue",
      value: `${APP_CONFIG.currency}${stats.totalRevenue.toFixed(0)}`,
      color: "bg-green-50",
    },
    {
      emoji: "🛵",
      label: "Active Riders",
      value: stats.activeRiders,
      color: "bg-emerald-50",
    },
    {
      emoji: "🏪",
      label: "Open Shops",
      value: stats.openShops,
      color: "bg-amber-50",
    },
    {
      emoji: "👥",
      label: "Total Users",
      value: stats.totalUsers,
      color: "bg-purple-50",
    },
    {
      emoji: "⏳",
      label: "Pending Verif.",
      value: stats.pendingVerifications,
      color: stats.pendingVerifications > 0 ? "bg-red-50" : "bg-gray-50",
    },
  ];

  const QUICK_ACTIONS = [
    {
      emoji: "👥",
      label: "Manage Users",
      path: "/admin/users",
      desc: `${stats.totalUsers} total`,
    },
    {
      emoji: "🏪",
      label: "Verify Shops",
      path: "/admin/shops",
      desc: "Review applications",
      highlight: stats.pendingVerifications > 0,
    },
    {
      emoji: "🛵",
      label: "Verify Riders",
      path: "/admin/riders",
      desc: "Review KYC",
      highlight: stats.pendingVerifications > 0,
    },
    {
      emoji: "📋",
      label: "All Orders",
      path: "/admin/orders",
      desc: `${stats.totalOrders} orders`,
    },
    {
      emoji: "📊",
      label: "Analytics",
      path: "/admin/analytics",
      desc: "Revenue & growth",
    },
    {
      emoji: "🔔",
      label: "Send Alert",
      path: "/admin/alerts",
      desc: "Broadcast to users",
    },
  ];

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="rounded-2xl bg-gradient-to-r from-gray-800 to-gray-700 p-5 text-white mb-6">
        <h1 className="text-xl font-extrabold">LaundryLink Admin</h1>
        <p className="text-white/70 text-sm mt-1">
          {new Date().toLocaleDateString("en-PH", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
        {stats.pendingVerifications > 0 && (
          <div className="mt-3 bg-amber-400/20 border border-amber-400/40 rounded-xl px-3 py-2">
            <p className="text-amber-300 text-sm font-bold">
              ⚠️ {stats.pendingVerifications} pending verification
              {stats.pendingVerifications > 1 ? "s" : ""} need review
            </p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {STAT_CARDS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
      <div className="mb-6">
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((a) => (
            <Card
              key={a.label}
              className={clsx(
                "p-4 cursor-pointer hover:shadow-elevated transition-all",
                a.highlight && "border-amber-300 bg-amber-50",
              )}
              onClick={() => go(a.path)}
            >
              <span className="text-2xl block mb-2">{a.emoji}</span>
              <p
                className={clsx(
                  "text-sm font-bold",
                  a.highlight ? "text-amber-800" : "text-gray-700",
                )}
              >
                {a.label}
              </p>
              <p
                className={clsx(
                  "text-xs mt-0.5",
                  a.highlight
                    ? "text-amber-600 font-semibold"
                    : "text-gray-400",
                )}
              >
                {a.desc}
              </p>
            </Card>
          ))}
        </div>
      </div>
      <SectionHeader
        title="Recent Orders"
        action="View All"
        onAction={() => go("/admin/orders")}
      />
      <div className="space-y-2">
        {orders.length === 0 ? (
          <Card className="p-8 text-center text-gray-400">No orders yet</Card>
        ) : (
          orders.map((order) => (
            <Card
              key={order.id}
              className="px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-sm text-gray-900">
                  {order.order_number}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {(order as any).customer?.full_name} →{" "}
                  {(order as any).shop?.shop_name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-primary text-sm">
                  {APP_CONFIG.currency}
                  {order.total_amount?.toFixed(0)}
                </span>
                <StatusBadge status={order.status} size="sm" />
              </div>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
