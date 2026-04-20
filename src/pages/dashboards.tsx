import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { MapPin, CheckCircle, XCircle } from "lucide-react";
import { useAuthStore } from "../store/auth.store";
import { riderService, shopService } from "../services/shop-rider.service";
import { orderService } from "../services/order.service";
import supabase from "../services/supabase";
import { RiderProfile, ShopProfile, Order } from "../types";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { StatCard } from "../components/common/Cards";
import {
  Button,
  Card,
  Toggle,
  StatusBadge,
  PageSpinner,
  EmptyState,
  SectionHeader,
} from "../components/ui";
import { SERVICE_LABELS, APP_CONFIG } from "../constants";
import clsx from "clsx";

// ─────────────────────────────────────────────────────────────────────────────
// CORRECT ORDER FLOW:
//
// 1. Customer books → status: pending
// 2. Rider sees pending orders, accepts one → rider_assigned
// 3. Rider heads to customer → rider_on_way_pickup
// 4. Rider picks up from customer → picked_up (now heading to shop)
// 5. Rider drops off at shop → confirmed  (shop can start)
// 6. Shop washes → washing
// 7. Shop marks done → ready_for_delivery
// 8. Rider picks up from shop → rider_on_way_delivery
// 9. Rider delivers to customer → delivered ✓
// ─────────────────────────────────────────────────────────────────────────────

// ─── Rider Dashboard ──────────────────────────────────────────────────────────
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
      const avail = await riderService.getAvailableOrders(); // now fetches 'pending'
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
      .channel("rider_avail_rt")
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
      toast.success(`✅ Accepted ${order.order_number}! Head to the customer.`);
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

  // Full rider status progression
  const NEXT_STATUS: Record<
    string,
    { label: string; next: string; color?: string }
  > = {
    // Step 2→3: accepted, now head to customer
    rider_assigned: {
      label: "📍 Head to Customer",
      next: "rider_on_way_pickup",
    },
    // Step 3→4: arrived at customer, picked up laundry
    rider_on_way_pickup: {
      label: "✅ Picked Up from Customer",
      next: "picked_up",
    },
    // Step 4→5: heading to shop, drop off laundry
    picked_up: {
      label: "🏪 Drop Off at Shop",
      next: "confirmed", // 'confirmed' is repurposed to mean "arrived at shop"
    },
    // Step 7→8: shop is done, go pick up from shop
    ready_for_delivery: {
      label: "🚀 Pick Up from Shop",
      next: "rider_on_way_delivery",
    },
    // Step 8→9: picked up from shop, deliver to customer
    rider_on_way_delivery: {
      label: "🎉 Delivered to Customer",
      next: "delivered",
    },
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
      toast.error("Could not update status");
    }
  };

  // Active = orders the rider is currently handling
  const activeOrders = myOrders.filter((o) =>
    [
      "rider_assigned",
      "rider_on_way_pickup",
      "picked_up",
      "rider_on_way_delivery",
    ].includes(o.status),
  );
  // Waiting = order is at shop being washed — rider will be called back when ready
  const waitingOrders = myOrders.filter((o) =>
    ["confirmed", "washing"].includes(o.status),
  );
  // Ready = shop is done, rider needs to go pick up
  const readyOrders = myOrders.filter((o) => o.status === "ready_for_delivery");

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
      {/* Status card */}
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
              label: "Today's Earnings",
              value: `${APP_CONFIG.currency}${earnings.toFixed(0)}`,
            },
            {
              label: "Rating",
              value: `⭐ ${profile?.rating?.toFixed(1) ?? "5.0"}`,
            },
            {
              label: "Deliveries",
              value: String(profile?.total_deliveries ?? 0),
            },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xl font-extrabold">{s.value}</p>
              <p className="text-xs text-white/70 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 🔔 Shop ready alert — rider needs to go pick up */}
      {readyOrders.length > 0 && (
        <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-xl flex items-center gap-3">
          <span className="text-2xl animate-bounce">✨</span>
          <div>
            <p className="font-bold text-green-800">
              {readyOrders.length} order{readyOrders.length > 1 ? "s" : ""}{" "}
              ready at the shop!
            </p>
            <p className="text-xs text-green-600">
              Laundry is washed — go pick it up for delivery.
            </p>
          </div>
        </div>
      )}

      {/* Active deliveries */}
      {(activeOrders.length > 0 || readyOrders.length > 0) && (
        <div className="mb-5">
          <SectionHeader title="⚡ My Active Deliveries" />
          <div className="space-y-3">
            {[...activeOrders, ...readyOrders].map((order) => {
              const action = NEXT_STATUS[order.status];
              return (
                <Card
                  key={order.id}
                  className={clsx(
                    "p-4 border-l-4",
                    order.status === "ready_for_delivery"
                      ? "border-l-green-500"
                      : "border-l-primary",
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-bold text-gray-900">
                      {order.order_number}
                    </p>
                    <StatusBadge status={order.status} size="sm" />
                  </div>
                  <div className="text-xs text-gray-500 space-y-1 mb-3">
                    <p className="flex items-center gap-1">
                      <MapPin size={11} className="text-primary" />
                      Shop: {(order as any).shop?.shop_name}
                    </p>
                    <p className="flex items-center gap-1">
                      <MapPin size={11} className="text-green-500" />
                      Customer: {(order as any).pickup_address?.full_address}
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
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Waiting — laundry is at shop being processed */}
      {waitingOrders.length > 0 && (
        <div className="mb-5">
          <SectionHeader title="⏳ At the Shop" />
          <div className="space-y-2">
            {waitingOrders.map((order) => (
              <Card
                key={order.id}
                className="px-4 py-3 flex items-center justify-between bg-blue-50 border-blue-100"
              >
                <div>
                  <p className="font-bold text-sm text-gray-900">
                    {order.order_number}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(order as any).shop?.shop_name} —{" "}
                    {SERVICE_LABELS[order.service_type]}
                  </p>
                  <p className="text-xs text-blue-600 font-semibold mt-1">
                    {order.status === "confirmed"
                      ? "🫧 Shop will start washing soon"
                      : "🫧 Washing in progress"}
                  </p>
                </div>
                <StatusBadge status={order.status} size="sm" />
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
        <button
          onClick={() => setTab("available")}
          className={clsx(
            "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
            tab === "available"
              ? "bg-white text-primary shadow-sm"
              : "text-gray-500",
          )}
        >
          Available ({available.length})
        </button>
        <button
          onClick={() => setTab("my")}
          className={clsx(
            "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
            tab === "my" ? "bg-white text-primary shadow-sm" : "text-gray-500",
          )}
        >
          All My Orders ({myOrders.length})
        </button>
      </div>

      {/* Available orders — MoveIt style */}
      {tab === "available" &&
        (available.length === 0 ? (
          <EmptyState
            emoji={isOnline ? "⏳" : "🔴"}
            title={isOnline ? "No available orders" : "Go online to see orders"}
            subtitle={
              isOnline
                ? "New bookings from customers will appear here."
                : "Toggle the switch above to start accepting."
            }
          />
        ) : (
          <div className="space-y-4">
            {available.map((order: any) => (
              <Card key={order.id} className="p-4 border-2 border-primary-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-primary bg-primary-50 px-2 py-1 rounded-full">
                    🆕 New Booking
                  </span>
                  <span className="text-xl font-extrabold text-green-600">
                    +{APP_CONFIG.currency}
                    {order.delivery_fee?.toFixed(0)}
                  </span>
                </div>

                {/* Visual route: Customer → Shop → Customer */}
                <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin
                      size={13}
                      className="text-green-500 mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-400">
                        STEP 1 — PICKUP FROM CUSTOMER
                      </p>
                      <p className="text-sm font-bold text-gray-800">
                        {order.pickup_address?.full_address}
                      </p>
                    </div>
                  </div>
                  <div className="border-l-2 border-dashed border-gray-300 ml-1.5 h-3" />
                  <div className="flex items-start gap-2">
                    <MapPin
                      size={13}
                      className="text-primary mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-xs font-bold text-gray-400">
                        STEP 2 — DROP OFF AT SHOP
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
                        STEP 3 — DELIVER BACK TO CUSTOMER
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
          <EmptyState
            emoji="📦"
            title="No deliveries yet"
            subtitle="Accept an order to get started."
          />
        ) : (
          <div className="space-y-2">
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

// ─── Shop Dashboard ───────────────────────────────────────────────────────────
// Shop only acts AFTER laundry physically arrives (status: confirmed)
// Shop does NOT need to confirm bookings — that's the rider's job
const SHOP_TABS = ["Incoming", "Washing", "Ready", "History"] as const;
const TAB_STATUSES: Record<string, string[]> = {
  Incoming: ["confirmed"], // laundry physically arrived at shop
  Washing: ["washing"], // shop is processing
  Ready: ["ready_for_delivery"], // done, waiting for rider pickup
  History: ["delivered", "cancelled"],
};
// Info-only view: orders on the way (rider accepted, hasn't dropped off yet)
const ON_THE_WAY_STATUSES = [
  "rider_assigned",
  "rider_on_way_pickup",
  "picked_up",
];

const SHOP_ACTIONS: Record<string, { label: string; next: string }> = {
  confirmed: { label: "🫧 Start Washing", next: "washing" },
  washing: { label: "✨ Mark as Ready", next: "ready_for_delivery" },
};

export function ShopDashboardPage() {
  const { user } = useAuthStore();
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<(typeof SHOP_TABS)[number]>("Incoming");
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
      .channel(`shop_rt:${shop.id}`)
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
  const onTheWay = orders.filter((o) => ON_THE_WAY_STATUSES.includes(o.status));
  const incomingCount = orders.filter((o) => o.status === "confirmed").length;
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
      {/* Hero */}
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
            { label: "Today's Orders", value: todayOrders.length },
            {
              label: "Revenue",
              value: `${APP_CONFIG.currency}${revenue.toFixed(0)}`,
            },
            { label: "Rating", value: `⭐ ${shop.rating.toFixed(1)}` },
            { label: "Arriving", value: onTheWay.length },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p
                className={clsx(
                  "text-lg font-extrabold",
                  s.label === "Arriving" && onTheWay.length > 0
                    ? "text-amber-300"
                    : "text-white",
                )}
              >
                {s.value}
              </p>
              <p className="text-[10px] text-white/70 mt-0.5 leading-tight">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* New laundry arrived banner */}
      {incomingCount > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-center gap-3">
          <span className="text-2xl animate-bounce">📦</span>
          <div>
            <p className="font-bold text-blue-800">
              {incomingCount} load{incomingCount > 1 ? "s" : ""} arrived — ready
              to wash!
            </p>
            <p className="text-xs text-blue-600">
              Rider has dropped off the laundry.
            </p>
          </div>
          <button
            onClick={() => setTab("Incoming")}
            className="ml-auto text-xs font-bold text-blue-700 underline"
          >
            Start Washing
          </button>
        </div>
      )}

      {/* On the way info */}
      {onTheWay.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-bold text-amber-800 mb-2">
            🛵 {onTheWay.length} order{onTheWay.length > 1 ? "s" : ""} on the
            way to your shop:
          </p>
          <div className="space-y-1">
            {onTheWay.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between text-xs text-amber-700"
              >
                <span>
                  {o.order_number} — {SERVICE_LABELS[o.service_type]}
                </span>
                <StatusBadge status={o.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
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
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg",
                "text-xs font-bold whitespace-nowrap transition-all min-w-[70px]",
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
                      : t === "Incoming"
                        ? "bg-blue-400 text-white"
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

      {/* Orders */}
      {filtered.length === 0 ? (
        <EmptyState
          emoji={tab === "Incoming" ? "📦" : "📋"}
          title={
            tab === "Incoming"
              ? "No laundry arrived yet"
              : `No ${tab.toLowerCase()} orders`
          }
          subtitle={
            tab === "Incoming"
              ? "Riders will drop off laundry here when they arrive."
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const action = SHOP_ACTIONS[order.status];
            return (
              <Card
                key={order.id}
                className={clsx(
                  "p-4",
                  order.status === "confirmed" &&
                    "border-l-4 border-l-blue-400",
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
                  <span>
                    📦 {order.bag_count} bag{order.bag_count > 1 ? "s" : ""}
                  </span>
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
                {tab === "Ready" && (
                  <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-3">
                    ✅ Ready — waiting for rider to pick up and deliver
                  </p>
                )}
                {action && (
                  <Button
                    size="sm"
                    fullWidth
                    onClick={() => updateStatus(order, action.next)}
                  >
                    {action.label}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
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
  const go = (path: string) => {
    window.location.href = path;
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
      desc: `${stats.totalOrders} total`,
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
              {stats.pendingVerifications > 1 ? "s" : ""} need your review
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
                (a as any).highlight && "border-amber-300 bg-amber-50",
              )}
              onClick={() => go(a.path)}
            >
              <span className="text-2xl block mb-2">{a.emoji}</span>
              <p
                className={clsx(
                  "text-sm font-bold",
                  (a as any).highlight ? "text-amber-800" : "text-gray-700",
                )}
              >
                {a.label}
              </p>
              <p
                className={clsx(
                  "text-xs mt-0.5",
                  (a as any).highlight
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
