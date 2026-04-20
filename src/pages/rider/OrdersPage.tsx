import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Phone, MapPin } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { riderService } from "../../services/shop-rider.service";
import { orderService } from "../../services/order.service";
import { Order, RiderProfile } from "../../types";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import {
  Button,
  Card,
  StatusBadge,
  EmptyState,
  PageSpinner,
} from "../../components/ui";
import { SERVICE_LABELS, APP_CONFIG } from "../../constants";
import clsx from "clsx";

// Full rider action map matching the corrected flow
const RIDER_ACTIONS: Record<
  string,
  { label: string; next: string; desc: string }
> = {
  rider_assigned: {
    label: "📍 Head to Customer",
    next: "rider_on_way_pickup",
    desc: "Go to customer address to collect laundry",
  },
  rider_on_way_pickup: {
    label: "✅ Picked Up from Customer",
    next: "picked_up",
    desc: "Laundry collected, heading to shop",
  },
  picked_up: {
    label: "🏪 Dropped Off at Shop",
    next: "confirmed",
    desc: "Laundry delivered to laundry shop",
  },
  ready_for_delivery: {
    label: "🚀 Picked Up from Shop",
    next: "rider_on_way_delivery",
    desc: "Washed laundry collected, heading to customer",
  },
  rider_on_way_delivery: {
    label: "🎉 Delivered to Customer",
    next: "delivered",
    desc: "Order complete!",
  },
};

const TABS = [
  {
    key: "active",
    label: "Active",
    statuses: [
      "rider_assigned",
      "rider_on_way_pickup",
      "picked_up",
      "rider_on_way_delivery",
    ],
  },
  {
    key: "at_shop",
    label: "At Shop",
    statuses: ["confirmed", "washing", "ready_for_delivery"],
  },
  { key: "completed", label: "Completed", statuses: ["delivered"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
] as const;

export default function RiderOrdersPage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    "active" | "at_shop" | "completed" | "cancelled"
  >("active");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const p = await riderService.getRiderProfile(user.id);
    setProfile(p);
    if (p) {
      const o = await orderService.getRiderOrders(p.id);
      setOrders(o);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdate = async (order: Order, nextStatus: string) => {
    if (!user || !nextStatus) return;
    setUpdating(order.id);
    try {
      await orderService.updateOrderStatus(
        order.id,
        nextStatus as any,
        user.id,
      );
      await load();
      toast.success("Status updated!");
    } catch {
      toast.error("Could not update status");
    } finally {
      setUpdating(null);
    }
  };

  const currentTab = TABS.find((t) => t.key === tab)!;
  const shown = orders.filter((o) =>
    (currentTab.statuses as readonly string[]).includes(o.status),
  );

  const counts = {
    active: orders.filter((o) =>
      [
        "rider_assigned",
        "rider_on_way_pickup",
        "picked_up",
        "rider_on_way_delivery",
      ].includes(o.status),
    ).length,
    at_shop: orders.filter((o) =>
      ["confirmed", "washing", "ready_for_delivery"].includes(o.status),
    ).length,
    completed: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  if (loading)
    return (
      <DashboardLayout title="My Orders">
        <PageSpinner />
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="My Deliveries">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { l: "Active", v: counts.active, c: "text-primary" },
          { l: "At Shop", v: counts.at_shop, c: "text-blue-600" },
          { l: "Done", v: counts.completed, c: "text-success" },
          { l: "Cancelled", v: counts.cancelled, c: "text-danger" },
        ].map((s) => (
          <div
            key={s.l}
            className="bg-white rounded-xl p-3 text-center shadow-card border border-gray-100"
          >
            <p className={`text-xl font-extrabold ${s.c}`}>{s.v}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "flex-1 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              tab === t.key
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500",
            )}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          emoji={
            tab === "active"
              ? "🛵"
              : tab === "at_shop"
                ? "🏪"
                : tab === "completed"
                  ? "✅"
                  : "❌"
          }
          title={`No ${tab === "at_shop" ? "orders at shop" : tab} orders`}
          subtitle={
            tab === "active" ? "Accept orders from the dashboard." : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {shown.map((order) => {
            const action = RIDER_ACTIONS[order.status];
            return (
              <div
                key={order.id}
                className={clsx(
                  "bg-white rounded-xl border-2 p-5 shadow-card",
                  order.status === "ready_for_delivery"
                    ? "border-green-300"
                    : "border-gray-100",
                )}
              >
                {order.status === "ready_for_delivery" && (
                  <div className="mb-3 px-3 py-2 bg-green-50 rounded-lg">
                    <p className="text-xs font-bold text-green-700">
                      ✨ Laundry ready! Go pick it up from the shop.
                    </p>
                  </div>
                )}
                {order.status === "confirmed" && (
                  <div className="mb-3 px-3 py-2 bg-blue-50 rounded-lg">
                    <p className="text-xs font-bold text-blue-700">
                      📦 Dropped off — shop will start washing soon.
                    </p>
                  </div>
                )}
                {order.status === "washing" && (
                  <div className="mb-3 px-3 py-2 bg-blue-50 rounded-lg">
                    <p className="text-xs font-bold text-blue-700">
                      🫧 Washing in progress — you'll be notified when ready.
                    </p>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-extrabold text-gray-900">
                      {order.order_number}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Route */}
                <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin
                      size={13}
                      className="text-green-500 mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">
                        Customer
                      </p>
                      <p className="text-sm font-semibold text-gray-800">
                        {(order as any).pickup_address?.full_address}
                      </p>
                    </div>
                  </div>
                  <div className="border-l-2 border-dashed border-gray-200 ml-1.5 h-3" />
                  <div className="flex items-start gap-2">
                    <MapPin
                      size={13}
                      className="text-primary mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">
                        Laundry Shop
                      </p>
                      <p className="text-sm font-semibold text-gray-800">
                        {(order as any).shop?.shop_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(order as any).shop?.address}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-500">
                  <span>👕 {SERVICE_LABELS[order.service_type]}</span>
                  <span>⚖️ ~{order.estimated_weight_kg}kg</span>
                  <span>
                    📦 {order.bag_count} bag{order.bag_count > 1 ? "s" : ""}
                  </span>
                  <span>
                    {order.payment_method === "cash_on_delivery"
                      ? "💵 COD"
                      : "📱 GCash"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 px-3 bg-green-50 rounded-lg mb-3">
                  <span className="text-sm text-green-700 font-semibold">
                    Your earnings
                  </span>
                  <span className="text-lg font-extrabold text-green-700">
                    +{APP_CONFIG.currency}
                    {order.delivery_fee.toFixed(0)}
                  </span>
                </div>

                {(order as any).customer?.phone && tab === "active" && (
                  <a
                    href={`tel:${(order as any).customer.phone}`}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary transition mb-3"
                  >
                    <Phone size={14} /> {(order as any).customer.phone}
                  </a>
                )}

                {action && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 mb-1">{action.desc}</p>
                    <Button
                      fullWidth
                      loading={updating === order.id}
                      onClick={() => handleUpdate(order, action.next)}
                    >
                      {action.label}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
