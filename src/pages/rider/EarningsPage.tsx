import React, { useEffect, useState, useCallback } from "react";
import { TrendingUp, Package, Star, Clock } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { riderService } from "../../services/shop-rider.service";
import { orderService } from "../../services/order.service";
import { Order, RiderProfile } from "../../types";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, PageSpinner } from "../../components/ui";
import { APP_CONFIG, SERVICE_LABELS } from "../../constants";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns";

interface EarningPeriod {
  label: string;
  orders: Order[];
  total: number;
}

export default function RiderEarningsPage() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const p = await riderService.getRiderProfile(user.id);
    setProfile(p);
    if (p) {
      const o = await orderService.getRiderOrders(p.id);
      setOrders(o.filter((ord) => ord.status === "delivered"));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const todayOrders = orders.filter((o) => o.updated_at?.startsWith(todayStr));
  const weekOrders = orders.filter((o) => {
    try {
      return isWithinInterval(parseISO(o.updated_at), {
        start: weekStart,
        end: weekEnd,
      });
    } catch {
      return false;
    }
  });
  const monthOrders = orders.filter((o) => {
    try {
      return parseISO(o.updated_at) >= monthStart;
    } catch {
      return false;
    }
  });

  const sum = (list: Order[]) => list.reduce((s, o) => s + o.delivery_fee, 0);

  const periods: EarningPeriod[] = [
    { label: "Today", orders: todayOrders, total: sum(todayOrders) },
    { label: "This Week", orders: weekOrders, total: sum(weekOrders) },
    { label: "This Month", orders: monthOrders, total: sum(monthOrders) },
    { label: "All Time", orders: orders, total: sum(orders) },
  ];

  // Group by date for history
  const byDate: Record<string, Order[]> = {};
  orders.forEach((o) => {
    const d = format(parseISO(o.updated_at || o.created_at), "yyyy-MM-dd");
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(o);
  });
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  if (loading)
    return (
      <DashboardLayout title="Earnings">
        <PageSpinner />
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="My Earnings">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 text-white p-6 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp size={20} className="text-white/80" />
          <p className="text-white/80 text-sm font-semibold">Total Earnings</p>
        </div>
        <p className="text-4xl font-extrabold">
          {APP_CONFIG.currency}
          {sum(orders).toFixed(2)}
        </p>
        <p className="text-white/70 text-sm mt-1">
          from {orders.length} completed deliveries
        </p>
      </div>

      {/* Period cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {periods.map((p) => (
          <Card key={p.label} className="p-4 text-center">
            <p className="text-xs text-gray-400 font-semibold mb-1">
              {p.label}
            </p>
            <p className="text-xl font-extrabold text-gray-900">
              {APP_CONFIG.currency}
              {p.total.toFixed(0)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {p.orders.length} deliveries
            </p>
          </Card>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Package size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            {orders.length}
          </p>
          <p className="text-xs text-gray-400 text-center">Total Deliveries</p>
        </Card>
        <Card className="p-4 flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Star size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            {profile?.rating?.toFixed(1) ?? "5.0"}
          </p>
          <p className="text-xs text-gray-400 text-center">Avg. Rating</p>
        </Card>
        <Card className="p-4 flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <TrendingUp size={18} className="text-green-600" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            {APP_CONFIG.currency}
            {orders.length > 0 ? (sum(orders) / orders.length).toFixed(0) : "0"}
          </p>
          <p className="text-xs text-gray-400 text-center">Avg. per Delivery</p>
        </Card>
      </div>

      {/* Delivery history */}
      <h2 className="text-lg font-extrabold text-gray-900 mb-3">
        Delivery History
      </h2>

      {orders.length === 0 ? (
        <Card className="p-12 text-center">
          <span className="text-5xl block mb-3">💰</span>
          <p className="font-bold text-gray-900">No completed deliveries yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Accept and complete orders to see your earnings here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const dayOrders = byDate[date];
            const dayTotal = sum(dayOrders);
            return (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-500">
                    {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                  </p>
                  <p className="text-sm font-extrabold text-green-600">
                    +{APP_CONFIG.currency}
                    {dayTotal.toFixed(0)}
                  </p>
                </div>

                <div className="space-y-2">
                  {dayOrders.map((order) => (
                    <Card
                      key={order.id}
                      className="px-4 py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-lg">
                          🛵
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {order.order_number}
                          </p>
                          <p className="text-xs text-gray-400">
                            {SERVICE_LABELS[order.service_type]} ·{" "}
                            {order.bag_count} bag
                            {order.bag_count > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-green-600">
                          +{APP_CONFIG.currency}
                          {order.delivery_fee.toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {(order as any).pickup_address?.city ?? ""}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
