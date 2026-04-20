import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Phone } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { orderService } from "../../services/order.service";
import { Order, OrderStatus } from "../../types";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { OrderCard } from "../../components/common/Cards";
import {
  Button,
  StatusBadge,
  Card,
  EmptyState,
  PageSpinner,
  StarRating,
  Modal,
} from "../../components/ui";
import { STATUS_TIMELINE, SERVICE_LABELS, APP_CONFIG } from "../../constants";
import { useRealtimeOrders } from "../../hooks/useRealtimeOrders";
import clsx from "clsx";

// ─── Orders List Page ─────────────────────────────────────────────────────────
export function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "history">("active");

  useEffect(() => {
    if (!user) return;
    orderService
      .getCustomerOrders(user.id)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [user]);

  // Auto-refresh when any order changes — no manual refresh needed
  useRealtimeOrders(
    user ? `customer_id=eq.${user.id}` : null,
    () => {
      if (user) orderService.getCustomerOrders(user.id).then(setOrders);
    },
    `orders_list_${user?.id}`,
  );

  const active = orders.filter(
    (o) => !["delivered", "cancelled", "refunded"].includes(o.status),
  );
  const history = orders.filter((o) =>
    ["delivered", "cancelled", "refunded"].includes(o.status),
  );
  const shown = tab === "active" ? active : history;

  if (loading)
    return (
      <DashboardLayout title="My Orders">
        <PageSpinner />
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="My Orders">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-full max-w-sm">
        {(["active", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize",
              tab === t
                ? "bg-white text-primary shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            {t === "active"
              ? `Active (${active.length})`
              : `History (${history.length})`}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          emoji={tab === "active" ? "📦" : "📋"}
          title={tab === "active" ? "No active orders" : "No order history"}
          subtitle={
            tab === "active"
              ? "Book a laundry pickup to get started!"
              : "Your completed orders will appear here."
          }
          action={tab === "active" ? "Book Now" : undefined}
          onAction={() => navigate("/customer/book")}
        />
      ) : (
        <div className="space-y-3">
          {shown.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onClick={() => navigate(`/customer/orders/${order.id}`)}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

// ─── Order Detail Page ────────────────────────────────────────────────────────
export function OrderDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRate, setShowRate] = useState(false);
  const [shopStar, setShopStar] = useState(0);
  const [riderStar, setRiderStar] = useState(0);
  const [rating, setRating] = useState(false);

  useEffect(() => {
    if (!id) return;
    orderService
      .getOrderById(id)
      .then((o) => {
        setOrder(o);
      })
      .finally(() => setLoading(false));

    const ch = orderService.subscribeToOrder(id, (updated) => {
      setOrder((prev) => (prev ? { ...prev, ...updated } : prev));
    });
    return () => {
      ch.unsubscribe();
    };
  }, [id]);

  const handleCancel = async () => {
    if (!order || !user) return;
    if (!confirm("Cancel this order?")) return;
    try {
      await orderService.updateOrderStatus(
        order.id,
        "cancelled",
        user.id,
        "Cancelled by customer",
      );
      setOrder((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
      toast.success("Order cancelled");
    } catch {
      toast.error("Could not cancel order");
    }
  };

  const handleRate = async () => {
    if (!order || !user) return;
    setRating(true);
    try {
      await orderService.submitRating(
        order.id,
        user.id,
        shopStar,
        riderStar || null,
        "",
        "",
      );
      setShowRate(false);
      toast.success("Thanks for your rating! ⭐");
    } catch {
      toast.error("Could not submit rating");
    } finally {
      setRating(false);
    }
  };

  if (loading)
    return (
      <DashboardLayout>
        <PageSpinner />
      </DashboardLayout>
    );
  if (!order)
    return (
      <DashboardLayout>
        <EmptyState emoji="❓" title="Order not found" />
      </DashboardLayout>
    );

  const statusIdx = STATUS_TIMELINE.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";
  const canCancel = ["pending", "confirmed"].includes(order.status);

  return (
    <DashboardLayout title={`Order ${order.order_number}`}>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary font-semibold mb-4 transition"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Status Header */}
      <Card className="p-4 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-extrabold text-lg text-gray-900">
              {order.order_number}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">
              {(order as any).shop?.shop_name}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </Card>

      {/* Timeline */}
      {!isCancelled && (
        <Card className="p-5 mb-4">
          <h3 className="font-bold text-gray-900 mb-4">Order Progress</h3>
          <div className="space-y-0">
            {STATUS_TIMELINE.map((s, i) => {
              const done = statusIdx >= i;
              const current = statusIdx === i;
              return (
                <div key={s.status} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all",
                        done
                          ? current
                            ? "bg-primary border-primary text-white"
                            : "bg-green-100 border-green-400 text-green-600"
                          : "bg-gray-50 border-gray-200 text-gray-300",
                      )}
                    >
                      {done ? s.icon : "○"}
                    </div>
                    {i < STATUS_TIMELINE.length - 1 && (
                      <div
                        className={clsx(
                          "w-0.5 h-6",
                          done && !current ? "bg-green-300" : "bg-gray-200",
                        )}
                      />
                    )}
                  </div>
                  <div className="pt-1.5 pb-3">
                    <p
                      className={clsx(
                        "text-sm font-semibold",
                        current
                          ? "text-primary"
                          : done
                            ? "text-gray-700"
                            : "text-gray-300",
                      )}
                    >
                      {s.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {isCancelled && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-center">
          <p className="font-bold text-red-700">❌ This order was cancelled</p>
        </div>
      )}

      {/* Rider info */}
      {order.rider_id && (order as any).rider && (
        <Card className="p-4 mb-4">
          <h3 className="font-bold text-gray-900 mb-3">Your Rider</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">
              🛵
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">
                {(order as any).rider?.user?.full_name ?? "Rider"}
              </p>
              <p className="text-xs text-gray-400">
                {(order as any).rider?.vehicle_type} ·{" "}
                {(order as any).rider?.vehicle_plate}
              </p>
            </div>
            <a
              href={`tel:${(order as any).rider?.user?.phone}`}
              className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition"
            >
              <Phone size={16} />
            </a>
          </div>
        </Card>
      )}

      {/* Order details */}
      <Card className="divide-y divide-gray-50 mb-4">
        <div className="px-4 py-3">
          <h3 className="font-bold text-gray-900">Order Details</h3>
        </div>
        {[
          ["Service", SERVICE_LABELS[order.service_type]],
          ["Bags", `${order.bag_count} bag(s)`],
          [
            "Est. Weight",
            `~${order.estimated_weight_kg} kg${order.actual_weight_kg ? ` → ${order.actual_weight_kg}kg actual` : ""}`,
          ],
          ["Pickup Date", order.scheduled_pickup_date],
          ["Pickup Time", order.scheduled_pickup_time],
          ...(order.special_instructions
            ? [["Notes", order.special_instructions]]
            : []),
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between items-start px-4 py-3 gap-4"
          >
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm font-semibold text-gray-900 text-right">
              {value}
            </span>
          </div>
        ))}
      </Card>

      {/* Payment */}
      <Card className="divide-y divide-gray-50 mb-4">
        <div className="px-4 py-3">
          <h3 className="font-bold text-gray-900">Payment Summary</h3>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Subtotal</span>
          <span className="text-sm font-semibold">
            {APP_CONFIG.currency}
            {order.subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Delivery Fee</span>
          <span className="text-sm font-semibold">
            {APP_CONFIG.currency}
            {order.delivery_fee.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="font-bold text-gray-900">Total</span>
          <span className="text-xl font-extrabold text-primary">
            {APP_CONFIG.currency}
            {order.total_amount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Payment</span>
          <span className="text-sm font-semibold">
            {order.payment_method === "cash_on_delivery"
              ? "💵 Cash on Delivery"
              : "📱 GCash"}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Status</span>
          <span
            className={clsx(
              "text-sm font-bold",
              order.payment_status === "paid"
                ? "text-green-600"
                : "text-amber-600",
            )}
          >
            {order.payment_status === "paid" ? "✅ Paid" : "⏳ Pending"}
          </span>
        </div>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        {canCancel && (
          <Button variant="danger" fullWidth onClick={handleCancel}>
            Cancel Order
          </Button>
        )}
        {isDelivered && !order.rating && (
          <Button variant="outline" fullWidth onClick={() => setShowRate(true)}>
            ⭐ Rate Your Experience
          </Button>
        )}
      </div>

      {/* Rating Modal */}
      <Modal
        open={showRate}
        onClose={() => setShowRate(false)}
        title="Rate Your Experience"
      >
        <div className="space-y-4">
          <StarRating
            label="Laundry Shop"
            value={shopStar}
            onChange={setShopStar}
          />
          {order.rider_id && (
            <StarRating
              label="Rider"
              value={riderStar}
              onChange={setRiderStar}
            />
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowRate(false)}
              fullWidth
            >
              Skip
            </Button>
            <Button onClick={handleRate} loading={rating} fullWidth>
              Submit
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
