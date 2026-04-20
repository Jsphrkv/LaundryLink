import React, { useEffect, useState } from "react";
import supabase from "../../services/supabase";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, PageSpinner } from "../../components/ui";
import {
  APP_CONFIG,
  SERVICE_LABELS,
  ORDER_STATUS_LABELS,
} from "../../constants";
import { format, subDays, parseISO } from "date-fns";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [
        { data: orders },
        { data: users },
        { count: totalShops },
        { count: totalRiders },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "status, total_amount, delivery_fee, service_type, created_at, updated_at",
          ),
        supabase.from("users").select("role, created_at"),
        supabase
          .from("shop_profiles")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("rider_profiles")
          .select("*", { count: "exact", head: true }),
      ]);

      const delivered = (orders ?? []).filter(
        (o: any) => o.status === "delivered",
      );
      const totalRevenue = delivered.reduce(
        (s: number, o: any) => s + (o.total_amount ?? 0),
        0,
      );
      const totalDeliveryFee = delivered.reduce(
        (s: number, o: any) => s + (o.delivery_fee ?? 0),
        0,
      );

      // Orders by status
      const byStatus: Record<string, number> = {};
      (orders ?? []).forEach((o: any) => {
        byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
      });

      // Orders by service
      const byService: Record<string, number> = {};
      (orders ?? []).forEach((o: any) => {
        byService[o.service_type] = (byService[o.service_type] ?? 0) + 1;
      });

      // Users by role
      const byRole: Record<string, number> = {};
      (users ?? []).forEach((u: any) => {
        byRole[u.role] = (byRole[u.role] ?? 0) + 1;
      });

      // Last 7 days orders
      const last7: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        last7[format(subDays(new Date(), i), "MMM d")] = 0;
      }
      (orders ?? []).forEach((o: any) => {
        try {
          const d = format(parseISO(o.created_at), "MMM d");
          if (d in last7) last7[d]++;
        } catch {}
      });

      setData({
        totalRevenue,
        totalDeliveryFee,
        byStatus,
        byService,
        byRole,
        last7,
        totalOrders: orders?.length ?? 0,
        totalShops,
        totalRiders,
      });
      setLoading(false);
    })();
  }, []);

  if (loading)
    return (
      <DashboardLayout title="Analytics">
        <PageSpinner />
      </DashboardLayout>
    );

  const maxDay = Math.max(
    ...Object.values(data.last7 as Record<string, number>),
    1,
  );

  return (
    <DashboardLayout title="Analytics">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Total Revenue",
            value: `${APP_CONFIG.currency}${data.totalRevenue.toFixed(0)}`,
            color: "bg-green-50",
            emoji: "💰",
          },
          {
            label: "Delivery Fees",
            value: `${APP_CONFIG.currency}${data.totalDeliveryFee.toFixed(0)}`,
            color: "bg-blue-50",
            emoji: "🛵",
          },
          {
            label: "Total Orders",
            value: data.totalOrders,
            color: "bg-amber-50",
            emoji: "📦",
          },
          {
            label: "Completed Orders",
            value: data.byStatus["delivered"] ?? 0,
            color: "bg-purple-50",
            emoji: "✅",
          },
        ].map((k) => (
          <Card key={k.label} className={`p-4 ${k.color}`}>
            <p className="text-2xl mb-1">{k.emoji}</p>
            <p className="text-2xl font-extrabold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {k.label}
            </p>
          </Card>
        ))}
      </div>

      {/* Last 7 days chart (CSS bar chart) */}
      <Card className="p-5 mb-5">
        <h3 className="font-extrabold text-gray-900 mb-4">
          Orders — Last 7 Days
        </h3>
        <div className="flex items-end gap-2 h-32">
          {Object.entries(data.last7).map(([day, count]) => {
            const pct = ((count as number) / maxDay) * 100;
            return (
              <div
                key={day}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <p className="text-xs font-bold text-primary">
                  {(count as number) > 0 ? (count as number) : ""}
                </p>
                <div
                  className="w-full bg-primary rounded-t-lg transition-all"
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
                <p className="text-[10px] text-gray-400 font-semibold whitespace-nowrap">
                  {day}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Orders by status */}
        <Card className="p-4">
          <h3 className="font-extrabold text-gray-900 mb-3">
            Orders by Status
          </h3>
          <div className="space-y-2">
            {Object.entries(data.byStatus)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600 capitalize">
                    {ORDER_STATUS_LABELS[status] ?? status}
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 bg-primary-200 rounded-full"
                      style={{
                        width: `${Math.max(((count as number) / data.totalOrders) * 80, 4)}px`,
                      }}
                    >
                      <div className="h-full bg-primary rounded-full" />
                    </div>
                    <span className="text-xs font-extrabold text-gray-900 w-6 text-right">
                      {count as number}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </Card>

        {/* Orders by service */}
        <Card className="p-4">
          <h3 className="font-extrabold text-gray-900 mb-3">
            Orders by Service
          </h3>
          <div className="space-y-2">
            {Object.entries(data.byService)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(([svc, count]) => (
                <div key={svc} className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">
                    {SERVICE_LABELS[svc] ?? svc}
                  </span>
                  <span className="text-xs font-extrabold text-gray-900">
                    {count as number}
                  </span>
                </div>
              ))}
            {Object.keys(data.byService).length === 0 && (
              <p className="text-xs text-gray-400">No data yet</p>
            )}
          </div>
        </Card>

        {/* Platform overview */}
        <Card className="p-4">
          <h3 className="font-extrabold text-gray-900 mb-3">
            Platform Overview
          </h3>
          <div className="space-y-3">
            {[
              {
                label: "Customers",
                value: data.byRole["customer"] ?? 0,
                emoji: "👤",
              },
              { label: "Riders", value: data.totalRiders, emoji: "🛵" },
              { label: "Shops", value: data.totalShops, emoji: "🏪" },
              {
                label: "Shop Owners",
                value: data.byRole["shop_owner"] ?? 0,
                emoji: "🧑‍💼",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
              >
                <span className="text-sm font-semibold text-gray-600">
                  {item.emoji} {item.label}
                </span>
                <span className="text-lg font-extrabold text-primary">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Completion rate */}
      <Card className="p-4">
        <h3 className="font-extrabold text-gray-900 mb-3">
          Order Completion Rate
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            {
              label: "Completion Rate",
              value:
                data.totalOrders > 0
                  ? `${(((data.byStatus["delivered"] ?? 0) / data.totalOrders) * 100).toFixed(0)}%`
                  : "—",
              color: "text-green-600",
            },
            {
              label: "Cancellation Rate",
              value:
                data.totalOrders > 0
                  ? `${(((data.byStatus["cancelled"] ?? 0) / data.totalOrders) * 100).toFixed(0)}%`
                  : "—",
              color: "text-red-500",
            },
            {
              label: "Avg Order Value",
              value:
                data.totalOrders > 0
                  ? `${APP_CONFIG.currency}${(data.totalRevenue / Math.max(data.byStatus["delivered"] ?? 1, 1)).toFixed(0)}`
                  : "—",
              color: "text-primary",
            },
          ].map((m) => (
            <div key={m.label}>
              <p className={`text-3xl font-extrabold ${m.color}`}>{m.value}</p>
              <p className="text-xs text-gray-400 font-medium mt-1">
                {m.label}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}
