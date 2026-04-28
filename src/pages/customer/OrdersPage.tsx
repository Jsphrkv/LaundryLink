import React, { useEffect, useState, lazy, Suspense, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Phone, Trash2, ChevronDown } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { orderService } from "../../services/order.service";
import { riderService } from "../../services/shop-rider.service";
import { addressService } from "../../services/address.service";
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
import { MapMarker } from "../../components/common/LiveMap";
import supabase from "../../services/supabase";

const LiveMap = lazy(() => import("../../components/common/LiveMap"));

const HISTORY_PAGE_SIZE = 3;

// ─── Orders List Page ─────────────────────────────────────────────────────────
export function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [historyPage, setHistoryPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const data = await orderService.getCustomerOrders(user.id);
    setOrders(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeOrders(
    user ? `customer_id=eq.${user.id}` : null,
    load,
    `orders_list_${user?.id}`,
  );

  const handleDeleteHistory = async (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove order ${order.order_number} from history?`)) return;
    setDeleting(order.id);
    try {
      // Soft delete: we just remove it from the customer's view
      // by marking it hidden (add is_hidden_by_customer column) OR
      // simply delete the rating record if any and nullify customer reference
      // For simplicity: we delete from the customer's local state only
      // and mark it in Supabase as hidden
      await supabase
        .from("orders")
        .update({ is_hidden_by_customer: true } as any)
        .eq("id", order.id);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      toast.success("Removed from history");
    } catch {
      // Column might not exist yet — just hide locally
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      toast.success("Removed from history");
    } finally {
      setDeleting(null);
    }
  };

  const active = orders.filter(
    (o) => !["delivered", "cancelled", "refunded"].includes(o.status),
  );
  const history = orders.filter((o) =>
    ["delivered", "cancelled", "refunded"].includes(o.status),
  );
  // Paginated history — show 3 at a time
  const historyShown = history.slice(0, historyPage * HISTORY_PAGE_SIZE);
  const hasMoreHistory = history.length > historyShown.length;
  const shown = tab === "active" ? active : historyShown;

  if (loading)
    return (
      <DashboardLayout title="My Orders">
        <PageSpinner />
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="My Orders">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-full max-w-sm">
        {(["active", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setHistoryPage(1);
            }}
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
            <div key={order.id} className="relative group">
              <OrderCard
                order={order}
                onClick={() => navigate(`/customer/orders/${order.id}`)}
              />
              {/* Delete button for history items */}
              {tab === "history" && (
                <button
                  onClick={(e) => handleDeleteHistory(order, e)}
                  disabled={deleting === order.id}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-all opacity-0 group-hover:opacity-100"
                  title="Remove from history"
                >
                  {deleting === order.id ? (
                    <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              )}
            </div>
          ))}

          {/* Pagination — Load More for history */}
          {tab === "history" && hasMoreHistory && (
            <button
              onClick={() => setHistoryPage((p) => p + 1)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-bold text-gray-500 hover:border-primary-300 hover:text-primary transition-all"
            >
              <ChevronDown size={16} />
              Load more ({history.length - historyShown.length} remaining)
            </button>
          )}
          {tab === "history" &&
            !hasMoreHistory &&
            history.length > HISTORY_PAGE_SIZE && (
              <p className="text-center text-xs text-gray-400 py-2">
                All {history.length} orders shown
              </p>
            )}
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
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);
  const [mapCenter, setMapCenter] = useState<
    { lat: number; lng: number } | undefined
  >();
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    orderService
      .getOrderById(id)
      .then((o) => {
        setOrder(o);
        const r = (o as any)?.rider;
        if (r?.current_lat && r?.current_lng && r.current_lat !== 0) {
          setRiderPos({ lat: r.current_lat, lng: r.current_lng });
        }
      })
      .finally(() => setLoading(false));

    const ch = orderService.subscribeToOrder(id, (updated) => {
      setOrder((prev) => (prev ? { ...prev, ...updated } : prev));
    });
    return () => {
      ch.unsubscribe();
    };
  }, [id]);

  // Subscribe to rider live GPS
  useEffect(() => {
    if (!order?.rider_id) return;
    const ch = riderService.subscribeToRiderLocation(
      order.rider_id,
      (lat, lng) => {
        if (lat !== 0 && lng !== 0) setRiderPos({ lat, lng });
      },
    );
    return () => {
      ch.unsubscribe();
    };
  }, [order?.rider_id]);

  // Build map markers — geocode addresses that have 0,0 coords
  useEffect(() => {
    if (!order) return;

    const buildMarkers = async () => {
      setMapLoading(true);
      const markers: MapMarker[] = [];
      const pickupAddr = (order as any).pickup_address;
      const shop = (order as any).shop;

      // ── Customer address ──
      let custLat = pickupAddr?.lat;
      let custLng = pickupAddr?.lng;
      // Geocode if missing or default 0,0
      if ((!custLat || custLat === 0) && pickupAddr?.full_address) {
        const geo = await addressService.geocodeAddress(
          pickupAddr.full_address,
        );
        if (geo) {
          custLat = geo.lat;
          custLng = geo.lng;
        }
      }
      if (custLat && custLng && custLat !== 0) {
        markers.push({
          lat: custLat,
          lng: custLng,
          label: "Your address",
          icon: "customer",
          popup: `📍 ${pickupAddr?.full_address ?? "Pickup location"}`,
        });
        setMapCenter({ lat: custLat, lng: custLng });
      }

      // ── Shop address ──
      let shopLat = shop?.lat;
      let shopLng = shop?.lng;
      if ((!shopLat || shopLat === 0) && shop?.address) {
        const geo = await addressService.geocodeAddress(shop.address);
        if (geo) {
          shopLat = geo.lat;
          shopLng = geo.lng;
        }
      }
      if (shopLat && shopLng && shopLat !== 0) {
        markers.push({
          lat: shopLat,
          lng: shopLng,
          label: shop?.shop_name ?? "Shop",
          icon: "shop",
          popup: `🏪 ${shop?.shop_name}`,
        });
      }

      // ── Rider position ──
      if (riderPos && riderPos.lat !== 0) {
        markers.push({
          lat: riderPos.lat,
          lng: riderPos.lng,
          label: "Rider",
          icon: "rider",
          popup: "🛵 Your Rider",
        });
        // Center on rider when active
        if (
          [
            "rider_assigned",
            "rider_on_way_pickup",
            "picked_up",
            "rider_on_way_delivery",
          ].includes(order.status)
        ) {
          setMapCenter({ lat: riderPos.lat, lng: riderPos.lng });
        }
      }

      setMapMarkers(markers);
      setMapLoading(false);
    };

    buildMarkers();
  }, [order, riderPos]);

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
  const canCancel = ["pending"].includes(order.status);
  const isRiderActive = [
    "rider_assigned",
    "rider_on_way_pickup",
    "picked_up",
    "rider_on_way_delivery",
  ].includes(order.status);

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

      {/* Live Map */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">
            {isRiderActive ? "🛵 Live Rider Tracking" : "📍 Delivery Route"}
          </h3>
          {isRiderActive && riderPos && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          )}
        </div>

        {mapLoading ? (
          <div className="h-64 bg-gray-50 rounded-xl flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Loading map…</p>
          </div>
        ) : mapMarkers.length === 0 ? (
          <div className="h-48 bg-gray-50 rounded-xl flex flex-col items-center justify-center gap-2">
            <span className="text-3xl">🗺️</span>
            <p className="text-sm text-gray-500 font-semibold">
              Map unavailable
            </p>
            <p className="text-xs text-gray-400">
              Address coordinates could not be resolved
            </p>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <LiveMap markers={mapMarkers} center={mapCenter} height="260px" />
          </Suspense>
        )}

        {mapMarkers.length > 0 && (
          <div className="flex gap-4 mt-3 flex-wrap">
            {mapMarkers.some((m) => m.icon === "customer") && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>📍</span> Your Address
              </span>
            )}
            {mapMarkers.some((m) => m.icon === "shop") && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>🏪</span> Laundry Shop
              </span>
            )}
            {mapMarkers.some((m) => m.icon === "rider") && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>🛵</span> Rider (live)
              </span>
            )}
          </div>
        )}
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

      {/* Order Details */}
      <Card className="divide-y divide-gray-50 mb-4">
        <div className="px-4 py-3">
          <h3 className="font-bold text-gray-900">Order Details</h3>
        </div>
        {[
          ["Service", SERVICE_LABELS[order.service_type]],
          ["Bags", `${order.bag_count} bag(s)`],
          ["Est. Weight", `~${order.estimated_weight_kg} kg`],
          ["Pickup Date", order.scheduled_pickup_date],
          ["Pickup Time", order.scheduled_pickup_time],
          ...(order.special_instructions
            ? [["Notes", order.special_instructions]]
            : []),
        ].map(([label, value]) => (
          <div
            key={label as string}
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
        {isDelivered && !(order as any).rating && (
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
