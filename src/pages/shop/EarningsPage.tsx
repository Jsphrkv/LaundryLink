import React, { useEffect, useState, useCallback } from "react";
import { TrendingUp, Calendar } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { shopService } from "../../services/shop-rider.service";
import { orderService } from "../../services/order.service";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, PageSpinner, EmptyState } from "../../components/ui";
import { APP_CONFIG, SERVICE_LABELS } from "../../constants";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
} from "date-fns";
import clsx from "clsx";

type Period = "today" | "week" | "month" | "all";

export default function ShopEarningsPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("week");

  const load = useCallback(async () => {
    if (!user) return;
    const shop = await shopService.getMyShop(user.id);
    if (!shop) {
      setLoading(false);
      return;
    }
    const data = await orderService.getShopOrders(shop.id);
    // Only count delivered orders for earnings
    setOrders(data.filter((o) => o.status === "delivered"));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const now = new Date();
  const today = format(now, "yyyy-MM-dd");

  const inPeriod = (dateStr: string): boolean => {
    try {
      const d = parseISO(dateStr);
      switch (period) {
        case "today":
          return format(d, "yyyy-MM-dd") === today;
        case "week":
          return isWithinInterval(d, {
            start: startOfWeek(now, { weekStartsOn: 1 }),
            end: endOfWeek(now, { weekStartsOn: 1 }),
          });
        case "month":
          return isWithinInterval(d, {
            start: startOfMonth(now),
            end: endOfMonth(now),
          });
        case "all":
          return true;
        default:
          return true;
      }
    } catch {
      return false;
    }
  };

  const filtered = orders.filter((o) => inPeriod(o.created_at));
  const totalRev = filtered.reduce((s, o) => s + (o.subtotal ?? 0), 0);
  const totalOrders = filtered.length;
  const avgOrder = totalOrders > 0 ? totalRev / totalOrders : 0;

  // Revenue by service type
  const byService: Record<string, { count: number; revenue: number }> = {};
  filtered.forEach((o) => {
    const k = o.service_type;
    if (!byService[k]) byService[k] = { count: 0, revenue: 0 };
    byService[k].count++;
    byService[k].revenue += o.subtotal ?? 0;
  });

  // Revenue by day (last 7 days for week view)
  const dailyMap: Record<string, number> = {};
  filtered.forEach((o) => {
    const d = format(parseISO(o.created_at), "MMM d");
    dailyMap[d] = (dailyMap[d] ?? 0) + (o.subtotal ?? 0);
  });
  const dailyEntries = Object.entries(dailyMap).slice(-7);
  const maxDaily = Math.max(...dailyEntries.map(([, v]) => v), 1);

  const PERIOD_LABELS: Record<Period, string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    all: "All Time",
  };

  if (loading)
    return (
      <DashboardLayout title="Earnings">
        <PageSpinner />
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="Earnings">
      {/* Period selector */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 overflow-x-auto">
        {(["today", "week", "month", "all"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={clsx(
              "flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              period === p
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500",
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {
            label: "Total Revenue",
            value: `${APP_CONFIG.currency}${totalRev.toFixed(0)}`,
            color: "text-green-600",
            bg: "bg-green-50",
            emoji: "💰",
          },
          {
            label: "Orders Done",
            value: totalOrders,
            color: "text-primary",
            bg: "bg-blue-50",
            emoji: "📦",
          },
          {
            label: "Avg per Order",
            value: `${APP_CONFIG.currency}${avgOrder.toFixed(0)}`,
            color: "text-purple-600",
            bg: "bg-purple-50",
            emoji: "📊",
          },
        ].map((k) => (
          <Card key={k.label} className={`p-4 ${k.bg}`}>
            <p className="text-xl mb-1">{k.emoji}</p>
            <p className={`text-xl font-extrabold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </Card>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          emoji="💰"
          title={`No earnings for ${PERIOD_LABELS[period].toLowerCase()}`}
          subtitle="Completed orders will show earnings here."
        />
      ) : (
        <>
          {/* Daily revenue bar chart */}
          {dailyEntries.length > 1 && (
            <Card className="p-5 mb-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-primary" />
                <h3 className="font-extrabold text-gray-900">Revenue Trend</h3>
              </div>
              <div className="flex items-end gap-2 h-28">
                {dailyEntries.map(([day, rev]) => (
                  <div
                    key={day}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <p className="text-[10px] font-bold text-primary">
                      {rev > 0 ? `${APP_CONFIG.currency}${rev.toFixed(0)}` : ""}
                    </p>
                    <div
                      className="w-full bg-primary rounded-t-lg transition-all"
                      style={{
                        height: `${Math.max((rev / maxDaily) * 80, 4)}%`,
                      }}
                    />
                    <p className="text-[9px] text-gray-400 font-semibold whitespace-nowrap">
                      {day}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* By service type */}
          <Card className="p-5 mb-5">
            <h3 className="font-extrabold text-gray-900 mb-4">By Service</h3>
            <div className="space-y-3">
              {Object.entries(byService)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([svc, stats]) => (
                  <div key={svc}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700">
                        {SERVICE_LABELS[svc] ?? svc}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">
                          {stats.count} orders
                        </span>
                        <span className="text-sm font-extrabold text-green-600">
                          {APP_CONFIG.currency}
                          {stats.revenue.toFixed(0)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${(stats.revenue / totalRev) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Recent completed orders */}
          <Card className="p-5">
            <h3 className="font-extrabold text-gray-900 mb-4">
              Completed Orders
              <span className="ml-2 text-sm font-semibold text-gray-400">
                ({filtered.length})
              </span>
            </h3>
            <div className="space-y-2">
              {filtered.slice(0, 20).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {order.order_number}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.customer?.full_name} ·{" "}
                      {SERVICE_LABELS[order.service_type]}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar size={10} />
                      {format(parseISO(order.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-extrabold text-green-600">
                      {APP_CONFIG.currency}
                      {order.subtotal?.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.payment_status === "paid" ? (
                        <span className="text-green-600 font-semibold">
                          ✅ Paid
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold">
                          ⏳ Pending
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              {filtered.length > 20 && (
                <p className="text-center text-xs text-gray-400 pt-2">
                  Showing 20 of {filtered.length} orders
                </p>
              )}
            </div>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
