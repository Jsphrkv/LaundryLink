import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { MapPin, CheckCircle, XCircle } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { riderService } from "../../services/shop-rider.service";
import { orderService } from "../../services/order.service";
import supabase from "../../services/supabase";
import { RiderProfile, Order } from "../../types";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import {
  Button,
  Card,
  Toggle,
  StatusBadge,
  PageSpinner,
  EmptyState,
  SectionHeader,
} from "../../components/ui";
import { SERVICE_LABELS, APP_CONFIG } from "../../constants";
import clsx from "clsx";

const NEXT_STATUS: Record<string, { label: string; next: string }> = {
  rider_assigned: { label: "▶ Start Pickup", next: "rider_on_way_pickup" },
  rider_on_way_pickup: { label: "✅ Picked Up", next: "picked_up" },
  ready_for_delivery: {
    label: "🚀 Start Delivery",
    next: "rider_on_way_delivery",
  },
  rider_on_way_delivery: { label: "🎉 Mark Delivered", next: "delivered" },
};

export function RiderDashboardPage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [available, setAvailable] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"available" | "my">("available");
  const [loading, setLoading] = useState(true);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const p = await riderService.getRiderProfile(user.id);
    setProfile(p);
    if (p) {
      setIsOnline(p.status === "online" || p.status === "on_delivery");
      const avail = await riderService.getAvailableOrders();
      setAvailable(avail as any);
      const mine = await orderService.getRiderOrders(p.id);
      setMyOrders(mine);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("avail_orders_rider")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load(),
      )
      .subscribe();
    return () => {
      ch.unsubscribe();
    };
  }, [load]);

  const toggleOnline = async (val: boolean) => {
    if (!profile) return;
    setIsOnline(val);
    await riderService.setOnlineStatus(profile.id, val ? "online" : "offline");
    if (val) {
      const id = riderService.watchLocation((lat, lng) =>
        riderService.updateLocation(profile.id, lat, lng),
      );
      if (id !== null) setWatchId(id);
      toast.success("You are now online 🟢");
    } else {
      if (watchId !== null) riderService.stopWatchingLocation(watchId);
      setWatchId(null);
      toast("You are now offline", { icon: "🔴" });
    }
  };

  const acceptOrder = async (order: Order) => {
    if (!profile) return;
    setAccepting(order.id);
    try {
      await orderService.assignRider(order.id, profile.id);
      await load();
      toast.success(`✅ Accepted ${order.order_number}!`);
    } catch {
      toast.error("Could not accept — may already be taken.");
    } finally {
      setAccepting(null);
    }
  };

  const declineOrder = (order: Order) => {
    setAvailable((prev) => prev.filter((o) => o.id !== order.id));
    toast("Order skipped", { icon: "⏭️" });
  };

  const updateStatus = async (order: Order) => {
    if (!user) return;
    const action = NEXT_STATUS[order.status];
    if (!action?.next) return;
    try {
      await orderService.updateOrderStatus(
        order.id,
        action.next as any,
        user.id,
      );
      await load();
      toast.success("Status updated!");
    } catch {
      toast.error("Could not update");
    }
  };

  const activeOrders = myOrders.filter((o) =>
    [
      "rider_assigned",
      "rider_on_way_pickup",
      "picked_up",
      "rider_on_way_delivery",
    ].includes(o.status),
  );
  const earnings = myOrders
    .filter((o) => o.status === "delivered")
    .reduce((s, o) => s + o.delivery_fee, 0);

  if (loading)
    return (
      <DashboardLayout>
        <PageSpinner />
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="Rider Dashboard">
      <div
        className={clsx(
          "rounded-2xl p-5 mb-5 text-white",
          isOnline
            ? "bg-gradient-to-r from-green-600 to-emerald-500"
            : "bg-gradient-to-r from-gray-600 to-gray-500",
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Status</p>
            <p className="text-2xl font-extrabold">
              {isOnline ? "🟢 Online" : "🔴 Offline"}
            </p>
          </div>
          <Toggle
            checked={isOnline}
            onChange={toggleOnline}
            label={isOnline ? "Go Offline" : "Go Online"}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            {
              l: "Total Earnings",
              v: `${APP_CONFIG.currency}${earnings.toFixed(0)}`,
            },
            { l: "Rating", v: `⭐ ${profile?.rating?.toFixed(1) ?? "5.0"}` },
            { l: "Deliveries", v: String(profile?.total_deliveries ?? 0) },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-xl font-extrabold">{s.v}</p>
              <p className="text-xs text-white/70 mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {activeOrders.length > 0 && (
        <div className="mb-5">
          <SectionHeader title="⚡ Active Deliveries" />
          <div className="space-y-3">
            {activeOrders.map((order) => {
              const action = NEXT_STATUS[order.status];
              return (
                <Card
                  key={order.id}
                  className="p-4 border-l-4 border-l-primary"
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-bold text-gray-900">
                      {order.order_number}
                    </p>
                    <StatusBadge status={order.status} size="sm" />
                  </div>
                  <div className="text-xs text-gray-500 space-y-1 mb-3">
                    <p className="flex items-center gap-1">
                      <MapPin size={11} className="text-primary" />{" "}
                      {(order as any).shop?.shop_name}
                    </p>
                    <p className="flex items-center gap-1">
                      <MapPin size={11} className="text-green-500" />{" "}
                      {(order as any).pickup_address?.full_address}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-extrabold text-green-600">
                      +{APP_CONFIG.currency}
                      {order.delivery_fee.toFixed(0)}
                    </span>
                    {action?.next ? (
                      <Button size="sm" onClick={() => updateStatus(order)}>
                        {action.label}
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg font-semibold">
                        ⏳ Waiting for shop
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
        {[
          { key: "available", label: `Available (${available.length})` },
          { key: "my", label: `My Deliveries (${myOrders.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={clsx(
              "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
              tab === t.key
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "available" &&
        (available.length === 0 ? (
          <EmptyState
            emoji={isOnline ? "⏳" : "🔴"}
            title={isOnline ? "No available orders" : "Go online to see orders"}
            subtitle={
              isOnline
                ? "New orders appear here when shops confirm them."
                : "Toggle the switch above."
            }
          />
        ) : (
          <div className="space-y-4">
            {available.map((order: any) => (
              <Card key={order.id} className="p-4 border-2 border-primary-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-primary bg-primary-50 px-2 py-1 rounded-full">
                    🆕 New Order
                  </span>
                  <span className="text-xl font-extrabold text-green-600">
                    +{APP_CONFIG.currency}
                    {order.delivery_fee?.toFixed(0)}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin
                      size={13}
                      className="text-primary mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-400">
                        PICKUP FROM
                      </p>
                      <p className="text-sm font-bold text-gray-800">
                        {order.shop?.shop_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {order.shop?.address}
                      </p>
                    </div>
                  </div>
                  <div className="border-l-2 border-dashed border-gray-300 ml-1.5 h-3" />
                  <div className="flex items-start gap-2">
                    <MapPin
                      size={13}
                      className="text-green-500 mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-400">
                        DELIVER TO
                      </p>
                      <p className="text-sm font-bold text-gray-800">
                        {order.pickup_address?.full_address}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  {[
                    {
                      v: `${order.bag_count} bag${order.bag_count > 1 ? "s" : ""}`,
                      l: "Bags",
                    },
                    { v: `~${order.estimated_weight_kg}kg`, l: "Weight" },
                    { v: SERVICE_LABELS[order.service_type], l: "Service" },
                  ].map((x) => (
                    <div key={x.l} className="bg-gray-50 rounded-lg py-2">
                      <p className="text-xs font-bold text-gray-900">{x.v}</p>
                      <p className="text-[10px] text-gray-400">{x.l}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="danger"
                    size="md"
                    fullWidth
                    leftIcon={<XCircle size={16} />}
                    onClick={() => declineOrder(order)}
                  >
                    Skip
                  </Button>
                  <Button
                    size="md"
                    fullWidth
                    loading={accepting === order.id}
                    leftIcon={<CheckCircle size={16} />}
                    onClick={() => acceptOrder(order)}
                  >
                    Accept
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ))}

      {tab === "my" &&
        (myOrders.length === 0 ? (
          <EmptyState emoji="📦" title="No deliveries yet" />
        ) : (
          <div className="space-y-3">
            {myOrders.map((o) => (
              <Card
                key={o.id}
                className="px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-sm text-gray-900">
                    {o.order_number}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {SERVICE_LABELS[o.service_type]}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={o.status} size="sm" />
                  <span className="text-sm font-bold text-green-600">
                    +{APP_CONFIG.currency}
                    {o.delivery_fee.toFixed(0)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ))}
    </DashboardLayout>
  );
}
