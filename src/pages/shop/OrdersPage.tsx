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
  StatusBadge,
  PageSpinner,
  EmptyState,
} from "../../components/ui";
import { SERVICE_LABELS, APP_CONFIG } from "../../constants";
import clsx from "clsx";

const ALL_TABS = [
  "All",
  "Pending",
  "Confirmed",
  "Washing",
  "Ready",
  "Delivered",
  "Cancelled",
] as const;
const TAB_STATUSES: Record<string, string[]> = {
  All: [],
  Pending: ["pending"],
  Confirmed: ["confirmed"],
  Washing: ["picked_up", "washing"],
  Ready: ["ready_for_delivery"],
  Delivered: ["delivered"],
  Cancelled: ["cancelled"],
};

const ORDER_ACTIONS: Record<
  string,
  { label: string; next: string; variant?: any }
> = {
  pending: { label: "✅ Confirm", next: "confirmed" },
  confirmed: { label: "🫧 Start Washing", next: "washing" },
  picked_up: { label: "🫧 Start Washing", next: "washing" },
  washing: { label: "✨ Mark Ready", next: "ready_for_delivery" },
};

export default function ShopOrdersPage() {
  const { user } = useAuthStore();
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<(typeof ALL_TABS)[number]>("All");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
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
      .channel(`shop_orders_list:${shop.id}`)
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

  const filtered = orders.filter((o) => {
    const matchTab =
      TAB_STATUSES[tab].length === 0 || TAB_STATUSES[tab].includes(o.status);
    const matchSearch =
      !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      ((o as any).customer?.full_name ?? "")
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const countFor = (t: (typeof ALL_TABS)[number]) =>
    t === "All"
      ? orders.length
      : orders.filter((o) => TAB_STATUSES[t].includes(o.status)).length;

  if (loading)
    return (
      <DashboardLayout title="Orders">
        <PageSpinner />
      </DashboardLayout>
    );
  if (!shop)
    return (
      <DashboardLayout title="Orders">
        <EmptyState
          emoji="🏪"
          title="No shop set up"
          subtitle="Go to Profile first."
        />
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="Order Management">
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by order # or customer name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap mb-5">
        {ALL_TABS.map((t) => {
          const count = countFor(t);
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all",
                tab === t
                  ? "border-primary bg-primary text-white"
                  : "border-gray-200 text-gray-600 hover:border-primary-300",
              )}
            >
              {t}
              {count > 0 && (
                <span
                  className={clsx(
                    "w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-extrabold",
                    tab === t
                      ? "bg-white text-primary"
                      : t === "Pending"
                        ? "bg-amber-400 text-white"
                        : "bg-gray-200 text-gray-600",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Total indicator */}
      <p className="text-xs text-gray-400 mb-3">
        Showing {filtered.length} of {orders.length} orders
      </p>

      {/* Order list */}
      {filtered.length === 0 ? (
        <EmptyState
          emoji="📋"
          title={`No ${tab === "All" ? "" : tab.toLowerCase()} orders`}
          subtitle={search ? `No results for "${search}"` : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const action = ORDER_ACTIONS[order.status];
            return (
              <Card
                key={order.id}
                className={clsx(
                  "p-4",
                  order.status === "pending" && "border-l-4 border-l-amber-400",
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-gray-900">
                        {order.order_number}
                      </p>
                      {order.status === "pending" && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(order as any).customer?.full_name} ·{" "}
                      {(order as any).customer?.phone}
                    </p>
                    <p className="text-xs text-gray-400">
                      📅 {order.scheduled_pickup_date} ·{" "}
                      {order.scheduled_pickup_time}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  {[
                    { icon: "👕", label: SERVICE_LABELS[order.service_type] },
                    { icon: "⚖️", label: `~${order.estimated_weight_kg}kg` },
                    {
                      icon: "📦",
                      label: `${order.bag_count} bag${order.bag_count > 1 ? "s" : ""}`,
                    },
                    {
                      icon: "💰",
                      label: `${APP_CONFIG.currency}${order.subtotal.toFixed(0)} subtotal`,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-gray-50 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 flex items-center gap-1.5"
                    >
                      <span>{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>

                {/* Pickup address */}
                <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                  📍 {(order as any).pickup_address?.full_address}
                </p>

                {order.special_instructions && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3 flex items-start gap-1.5">
                    <span className="shrink-0">📝</span>{" "}
                    {order.special_instructions}
                  </p>
                )}

                {/* Rider info */}
                {order.rider_id && (
                  <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mb-3">
                    🛵 Rider:{" "}
                    {(order as any).rider?.user?.full_name ?? "Assigned"}
                  </p>
                )}

                {/* Payment */}
                <div className="flex items-center justify-between py-2 border-t border-gray-50">
                  <span className="text-xs text-gray-400">
                    {order.payment_method === "cash_on_delivery"
                      ? "💵 Cash on Delivery"
                      : "📱 GCash"}
                    {" · "}
                    <span
                      className={
                        order.payment_status === "paid"
                          ? "text-green-600 font-semibold"
                          : "text-amber-600 font-semibold"
                      }
                    >
                      {order.payment_status === "paid"
                        ? "Paid"
                        : "Pending payment"}
                    </span>
                  </span>
                  <span className="font-extrabold text-primary text-base">
                    {APP_CONFIG.currency}
                    {order.total_amount.toFixed(2)}
                  </span>
                </div>

                {/* Actions */}
                {action && (
                  <div className="flex gap-2 mt-3">
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
