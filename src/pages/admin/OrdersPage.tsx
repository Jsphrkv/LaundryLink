import React, { useEffect, useState } from "react";
import { Search, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import supabase from "../../services/supabase";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import {
  Card,
  PageSpinner,
  Input,
  StatusBadge,
  Modal,
  Button,
  Select,
} from "../../components/ui";
import {
  SERVICE_LABELS,
  ORDER_STATUS_LABELS,
  APP_CONFIG,
} from "../../constants";
import clsx from "clsx";

const ALL_STATUSES = [
  "pending",
  "rider_assigned",
  "rider_on_way_pickup",
  "picked_up",
  "confirmed",
  "washing",
  "ready_for_delivery",
  "rider_on_way_delivery",
  "delivered",
  "cancelled",
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [overrideStatus, setOverrideStatus] = useState("");
  const [overriding, setOverriding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select(
        `*, customer:users(full_name, email, phone), shop:shop_profiles(shop_name, address), rider:rider_profiles(vehicle_plate, user:users(full_name, phone)), pickup_address:addresses(full_address, city)`,
      )
      .order("created_at", { ascending: false })
      .limit(200);
    setOrders(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleOverride = async () => {
    if (!selected || !overrideStatus) return;
    setOverriding(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: overrideStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id);
      if (error) throw error;

      // Log to status history
      await supabase.from("order_status_history").insert({
        order_id: selected.id,
        status: overrideStatus,
        note: "Status overridden by Admin",
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

      toast.success(
        `Status updated to: ${ORDER_STATUS_LABELS[overrideStatus]}`,
      );
      setSelected(null);
      await load();
    } catch (err: any) {
      toast.error(err.message || "Could not override status");
    } finally {
      setOverriding(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!selected) return;
    try {
      await supabase
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", selected.id);
      toast.success("Marked as paid");
      setSelected((prev) =>
        prev ? { ...prev, payment_status: "paid" } : prev,
      );
      await load();
    } catch {
      toast.error("Could not update payment");
    }
  };

  const handleCancelOrder = async () => {
    if (!selected || !confirm(`Cancel order ${selected.order_number}?`)) return;
    try {
      await supabase
        .from("orders")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", selected.id);
      toast.success("Order cancelled");
      setSelected(null);
      await load();
    } catch {
      toast.error("Could not cancel order");
    }
  };

  const STATUS_FILTERS = [
    "all",
    "pending",
    "confirmed",
    "washing",
    "delivered",
    "cancelled",
  ];
  const filtered = orders.filter((o) => {
    const matchSearch =
      o.order_number.includes(search) ||
      (o.customer?.full_name ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      (o.shop?.shop_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || o.status === filter;
    return matchSearch && matchFilter;
  });

  if (loading)
    return (
      <DashboardLayout title="All Orders">
        <PageSpinner />
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="All Orders">
      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all capitalize",
              filter === f
                ? "border-primary bg-primary text-white"
                : "border-gray-200 text-gray-500 hover:border-primary-300",
            )}
          >
            {f === "all"
              ? `All (${orders.length})`
              : (ORDER_STATUS_LABELS[f] ?? f)}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by order #, customer, or shop..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={15} />}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {[
                  "Order #",
                  "Customer",
                  "Shop",
                  "Service",
                  "Total",
                  "Status",
                  "Date",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                    {order.order_number}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">
                      {order.customer?.full_name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.customer?.phone}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">
                      {order.shop?.shop_name ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {SERVICE_LABELS[order.service_type]}
                  </td>
                  <td className="px-4 py-3 font-extrabold text-primary whitespace-nowrap">
                    {APP_CONFIG.currency}
                    {order.total_amount?.toFixed(0)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(order.created_at).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setSelected(order);
                        setOverrideStatus(order.status);
                      }}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Order management modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Manage ${selected?.order_number}`}
        maxWidth="max-w-lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={selected.status} />
              {selected.payment_status === "paid" ? (
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  ✅ Paid
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  ⏳ Unpaid
                </span>
              )}
            </div>

            {/* Order details grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Customer", selected.customer?.full_name],
                ["Phone", selected.customer?.phone],
                ["Shop", selected.shop?.shop_name],
                ["Service", SERVICE_LABELS[selected.service_type]],
                ["Weight", `~${selected.estimated_weight_kg}kg`],
                ["Bags", `${selected.bag_count} bags`],
                ["Pickup Date", selected.scheduled_pickup_date],
                ["Time Slot", selected.scheduled_pickup_time],
                ["Rider", selected.rider?.user?.full_name ?? "Not assigned"],
                ["Address", selected.pickup_address?.full_address],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="bg-gray-50 rounded-lg p-2"
                >
                  <p className="text-xs text-gray-400 font-semibold">{label}</p>
                  <p className="font-semibold text-gray-900 mt-0.5 text-xs">
                    {value ?? "—"}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center py-2 px-3 bg-primary-50 rounded-xl">
              <span className="font-bold text-gray-700">Total</span>
              <span className="text-xl font-extrabold text-primary">
                {APP_CONFIG.currency}
                {selected.total_amount?.toFixed(2)}
              </span>
            </div>

            {/* ── Admin Override Controls ── */}
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-sm font-extrabold text-gray-700 flex items-center gap-2">
                <RefreshCw size={14} /> Admin Override
              </p>

              {/* Status override dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  Force Status Change
                </label>
                <div className="flex gap-2">
                  <select
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value)}
                    className="flex-1 rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABELS[s] ?? s}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    loading={overriding}
                    disabled={overrideStatus === selected.status}
                    onClick={handleOverride}
                    leftIcon={<RefreshCw size={14} />}
                  >
                    Apply
                  </Button>
                </div>
                {overrideStatus === selected.status && (
                  <p className="text-xs text-gray-400 mt-1">
                    Select a different status to apply
                  </p>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex gap-2">
                {selected.payment_status !== "paid" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    fullWidth
                    onClick={handleMarkPaid}
                    leftIcon={<span className="text-sm">💰</span>}
                  >
                    Mark as Paid
                  </Button>
                )}
                {!["delivered", "cancelled"].includes(selected.status) && (
                  <Button
                    size="sm"
                    variant="danger"
                    fullWidth
                    onClick={handleCancelOrder}
                  >
                    Cancel Order
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
