import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { orderService } from "../../services/order.service";
import { Order } from "../../types";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { OrderCard } from "../../components/common/Cards";
import {
  Button,
  SectionHeader,
  EmptyState,
  PageSpinner,
  Card,
  StatusBadge,
} from "../../components/ui";
import { APP_CONFIG, SERVICE_LABELS } from "../../constants";

const TIPS = [
  { emoji: "👕", text: "Sort clothes by color before pickup" },
  { emoji: "🏷️", text: "Label delicate items for special care" },
  { emoji: "⏰", text: "Book 1 day ahead for express service" },
];

const SERVICES = [
  {
    key: "wash_fold",
    icon: "👕",
    label: "Wash & Fold",
    color: "bg-blue-50 hover:bg-blue-100",
  },
  {
    key: "wash_dry",
    icon: "💨",
    label: "Wash & Dry",
    color: "bg-green-50 hover:bg-green-100",
  },
  {
    key: "express",
    icon: "⚡",
    label: "Express",
    color: "bg-amber-50 hover:bg-amber-100",
  },
  {
    key: "dry_clean",
    icon: "🧴",
    label: "Dry Clean",
    color: "bg-purple-50 hover:bg-purple-100",
  },
  {
    key: "ironing",
    icon: "👔",
    label: "Ironing",
    color: "bg-pink-50 hover:bg-pink-100",
  },
];

export default function CustomerHomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = user?.full_name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    if (!user) return;
    orderService
      .getCustomerOrders(user.id)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [user]);

  // Real-time: auto-refresh orders when status changes (no manual refresh needed)
  useEffect(() => {
    if (!user) return;
    const supabaseModule = import("../../services/supabase");
    let cleanup: (() => void) | undefined;
    supabaseModule.then(({ default: supabase }) => {
      const ch = supabase
        .channel(`customer_orders_rt:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
            filter: `customer_id=eq.${user.id}`,
          },
          () => {
            orderService.getCustomerOrders(user.id).then(setOrders);
          },
        )
        .subscribe();
      cleanup = () => ch.unsubscribe();
    });
    return () => cleanup?.();
  }, [user]);

  const activeOrders = orders.filter(
    (o) => !["delivered", "cancelled", "refunded"].includes(o.status),
  );
  const recentOrders = orders
    .filter((o) => ["delivered", "cancelled"].includes(o.status))
    .slice(0, 3);
  const totalSpent = orders
    .filter((o) => o.status === "delivered")
    .reduce((s, o) => s + o.total_amount, 0);

  if (loading)
    return (
      <DashboardLayout>
        <PageSpinner />
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      {/* Hero banner */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-light text-white p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/80 text-sm">{greeting},</p>
            <h1 className="text-2xl font-extrabold mt-0.5">{firstName} 👋</h1>
            <p className="text-white/70 text-sm mt-1">
              Ready for fresh laundry?
            </p>
          </div>
          <span className="text-4xl">🧺</span>
        </div>
        <button
          onClick={() => navigate("/customer/book")}
          className="mt-4 inline-flex items-center gap-2 bg-white text-primary font-bold px-5 py-2.5 rounded-xl hover:bg-white/90 transition-all active:scale-[0.98] shadow-sm text-sm"
        >
          <ShoppingBag size={16} />
          Book a Pickup
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-extrabold text-primary">
            {orders.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Total Orders</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-extrabold text-success">
            {activeOrders.length}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Active</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-lg font-extrabold text-primary">
            {APP_CONFIG.currency}
            {totalSpent.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Total Spent</p>
        </Card>
      </div>

      {/* Services */}
      <div className="mb-6">
        <SectionHeader title="Our Services" />
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {SERVICES.map((s) => (
            <button
              key={s.key}
              onClick={() => navigate("/customer/book")}
              className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all shrink-0 ${s.color}`}
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs font-bold text-gray-700 whitespace-nowrap">
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Active orders */}
      {activeOrders.length > 0 && (
        <div className="mb-6">
          <SectionHeader
            title="Active Orders"
            action="See All"
            onAction={() => navigate("/customer/orders")}
          />
          <div className="space-y-3">
            {activeOrders.map((order) => (
              <ActiveOrderBanner
                key={order.id}
                order={order}
                onClick={() => navigate(`/customer/orders/${order.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty booking CTA */}
      {activeOrders.length === 0 && (
        <div className="mb-6">
          <Card className="p-8 text-center border-dashed border-2 border-gray-200 shadow-none bg-gray-50">
            <span className="text-5xl block mb-3">🧺</span>
            <h3 className="font-bold text-gray-900 mb-1">No active orders</h3>
            <p className="text-gray-500 text-sm mb-4">
              Book your first laundry pickup today!
            </p>
            <Button
              onClick={() => navigate("/customer/book")}
              leftIcon={<ShoppingBag size={16} />}
            >
              Book Now
            </Button>
          </Card>
        </div>
      )}

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="mb-6">
          <SectionHeader
            title="Recent Orders"
            action="View All"
            onAction={() => navigate("/customer/orders")}
          />
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onClick={() => navigate(`/customer/orders/${order.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div>
        <SectionHeader title="Laundry Tips 💡" />
        <Card className="divide-y divide-gray-50">
          {TIPS.map((tip, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <span className="text-xl">{tip.emoji}</span>
              <p className="text-sm text-gray-600">{tip.text}</p>
            </div>
          ))}
        </Card>
      </div>
    </DashboardLayout>
  );
}

function ActiveOrderBanner({
  order,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  return (
    <Card
      className="p-4 border-l-4 border-l-primary cursor-pointer hover:shadow-elevated transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-sm text-gray-900">
            {order.order_number}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {(order as any).shop?.shop_name ?? "—"}
          </p>
          <div className="mt-2">
            <StatusBadge status={order.status} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-extrabold text-primary">
            {APP_CONFIG.currency}
            {order.total_amount.toFixed(0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {SERVICE_LABELS[order.service_type]}
          </p>
        </div>
      </div>
    </Card>
  );
}
