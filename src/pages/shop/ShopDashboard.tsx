import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/auth.store";
import { shopService } from "../../services/shop-rider.service";
import { orderService } from "../../services/order.service";
import supabase from "../../services/supabase";
import { ShopProfile, Order } from "../../types";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import {
  Button,
  Card,
  Toggle,
  StatusBadge,
  PageSpinner,
  EmptyState,
} from "../../components/ui";
import { SERVICE_LABELS, APP_CONFIG } from "../../constants";
import clsx from "clsx";

const SHOP_TABS = ["Pending", "In Progress", "Ready", "History"] as const;
const TAB_STATUSES: Record<string, string[]> = {
  Pending: ["pending"],
  "In Progress": ["confirmed", "picked_up", "washing"],
  Ready: ["ready_for_delivery"],
  History: ["delivered", "cancelled"],
};
const SHOP_ACTIONS: Record<string, { label: string; next: string }> = {
  pending: { label: "✅ Confirm Order", next: "confirmed" },
  confirmed: { label: "🫧 Start Washing", next: "washing" },
  picked_up: { label: "🫧 Start Washing", next: "washing" },
  washing: { label: "✨ Mark as Ready", next: "ready_for_delivery" },
};

export function ShopDashboardPage() {
  const { user } = useAuthStore();
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<(typeof SHOP_TABS)[number]>("Pending");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const s = await shopService.getMyShop(user.id);
    setShop(s);
    if (s) {
      const o = await orderService.getShopOrders(s.id);
      setOrders(o);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!shop) return;
    const ch = supabase
      .channel(`shop_orders:${shop.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `shop_id=eq.${shop.id}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      ch.unsubscribe();
    };
  }, [shop?.id, load]);

  const toggleOpen = async (val: boolean) => {
    if (!shop) return;
    try {
      await shopService.toggleShopStatus(shop.id, val);
      setShop((p) => (p ? { ...p, is_open: val } : p));
      toast.success(val ? "Shop is now open 🟢" : "Shop is now closed 🔴");
    } catch {
      toast.error("Could not update status");
    }
  };

  const updateStatus = async (order: Order, next: string) => {
    if (!user) return;
    try {
      await orderService.updateOrderStatus(order.id, next as any, user.id);
      await load();
      toast.success("Order updated!");
    } catch {
      toast.error("Could not update order");
    }
  };

  const filtered = orders.filter((o) => TAB_STATUSES[tab]?.includes(o.status));
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const todayOrders = orders.filter(
    (o) => new Date(o.created_at).toDateString() === new Date().toDateString(),
  );
  const revenue = todayOrders
    .filter((o) => o.status === "delivered")
    .reduce((s, o) => s + o.subtotal, 0);

  if (loading)
    return (
      <DashboardLayout>
        <PageSpinner />
      </DashboardLayout>
    );
  if (!shop)
    return (
      <DashboardLayout title="Shop Dashboard">
        <EmptyState
          emoji="🏪"
          title="Set up your shop profile"
          subtitle="Go to Profile to complete your setup."
          action="Go to Profile"
          onAction={() => (window.location.href = "/shop/profile")}
        />
      </DashboardLayout>
    );

  return (
    <DashboardLayout title={shop.shop_name}>
      <div className="rounded-2xl bg-gradient-to-r from-primary-700 to-primary p-5 text-white mb-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xl font-extrabold">{shop.shop_name}</p>
            <p className="text-white/70 text-sm mt-0.5">{shop.address}</p>
          </div>
          <Toggle
            checked={shop.is_open}
            onChange={toggleOpen}
            label={shop.is_open ? "🟢 Open" : "🔴 Closed"}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { l: "Today's Orders", v: todayOrders.length },
            { l: "Revenue", v: `${APP_CONFIG.currency}${revenue.toFixed(0)}` },
            { l: "Rating", v: `⭐ ${shop.rating.toFixed(1)}` },
            { l: "Pending", v: pendingCount },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <p
                className={clsx(
                  "text-lg font-extrabold",
                  s.l === "Pending" && pendingCount > 0
                    ? "text-amber-300"
                    : "text-white",
                )}
              >
                {s.v}
              </p>
              <p className="text-[10px] text-white/70 mt-0.5 leading-tight">
                {s.l}
              </p>
            </div>
          ))}
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border-2 border-amber-200 rounded-xl flex items-center gap-3">
          <span className="text-2xl animate-bounce">🔔</span>
          <div>
            <p className="font-bold text-amber-800">
              {pendingCount} new order{pendingCount > 1 ? "s" : ""} waiting!
            </p>
            <p className="text-xs text-amber-600">Confirm to route a rider.</p>
          </div>
          <button
            onClick={() => setTab("Pending")}
            className="ml-auto text-xs font-bold text-amber-700 underline"
          >
            View
          </button>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 overflow-x-auto">
        {SHOP_TABS.map((t) => {
          const count = orders.filter((o) =>
            TAB_STATUSES[t]?.includes(o.status),
          ).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all min-w-[70px]",
                tab === t ? "bg-white text-primary shadow-sm" : "text-gray-500",
              )}
            >
              {t}
              {count > 0 && (
                <span
                  className={clsx(
                    "w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-extrabold",
                    tab === t
                      ? "bg-primary text-white"
                      : t === "Pending"
                        ? "bg-amber-400 text-white"
                        : "bg-gray-300 text-gray-600",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState emoji="📋" title={`No ${tab.toLowerCase()} orders`} />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const action = SHOP_ACTIONS[order.status];
            return (
              <Card
                key={order.id}
                className={clsx(
                  "p-4",
                  order.status === "pending" && "border-2 border-amber-200",
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900">
                      {order.order_number}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(order as any).customer?.full_name} ·{" "}
                      {(order as any).customer?.phone}
                    </p>
                  </div>
                  <StatusBadge status={order.status} size="sm" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-3">
                  <span>👕 {SERVICE_LABELS[order.service_type]}</span>
                  <span>⚖️ ~{order.estimated_weight_kg}kg</span>
                  <span>📦 {order.bag_count} bags</span>
                  <span>
                    💰 {APP_CONFIG.currency}
                    {order.subtotal.toFixed(0)}
                  </span>
                </div>
                {order.special_instructions && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">
                    📝 {order.special_instructions}
                  </p>
                )}
                {order.rider_id && (
                  <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mb-3">
                    🛵 Rider assigned
                  </p>
                )}
                {action && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      fullWidth
                      onClick={() => updateStatus(order, action.next)}
                    >
                      {action.label}
                    </Button>
                    {order.status === "pending" && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => updateStatus(order, "cancelled")}
                      >
                        ✕ Reject
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
