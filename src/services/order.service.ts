// ─── order.service.ts ────────────────────────────────────────────────────────
import supabase from "./supabase";
import { Order, OrderStatus, BookingState } from "../types";
import { APP_CONFIG } from "../constants";

export const orderService = {
  async createOrder(customerId: string, booking: BookingState): Promise<Order> {
    const shop = booking.selected_shop!;
    const service = shop.services.find(
      (s) => s.service_type === booking.service_type,
    );
    if (!service) throw new Error("Service not found");

    const subtotal = service.price_per_kg * booking.estimated_weight_kg;
    const distanceKm = shop.distance_km ?? 3;
    const deliveryFee =
      APP_CONFIG.deliveryFeeBase + distanceKm * APP_CONFIG.deliveryFeePerKm;
    const total = subtotal + deliveryFee;
    const orderNumber = `LL-${Date.now().toString().slice(-8)}`;

    // scheduled_time is a display slot like "02:00 PM – 04:00 PM"
    // Extract just the start time ("02:00 PM") for date parsing
    const startTime = booking.scheduled_time
      ? booking.scheduled_time.split(/[–\-]/)[0].trim() // grab everything before the dash
      : "08:00 AM";

    // Convert 12-hour to 24-hour so Date constructor parses reliably
    const to24hr = (t: string) => {
      const [time, period] = t.split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
      if (period?.toUpperCase() === "AM" && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    const pickupDate = new Date(
      `${booking.scheduled_date}T${to24hr(startTime)}:00`,
    );
    // Fallback: if still invalid, just use noon on the scheduled date
    const validPickupDate = isNaN(pickupDate.getTime())
      ? new Date(`${booking.scheduled_date}T12:00:00`)
      : pickupDate;
    const estCompletion = new Date(
      validPickupDate.getTime() + service.estimated_hours * 3600000,
    );

    const { data, error } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        shop_id: shop.id,
        pickup_address_id: booking.pickup_address!.id,
        service_type: booking.service_type,
        scheduled_pickup_date: booking.scheduled_date,
        scheduled_pickup_time: booking.scheduled_time,
        estimated_weight_kg: booking.estimated_weight_kg,
        special_instructions: booking.special_instructions,
        bag_count: booking.bag_count,
        status: "pending",
        payment_method: booking.payment_method,
        payment_status: "pending",
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: total,
        estimated_completion: estCompletion.toISOString(),
      })
      .select("*, shop:shop_profiles(*), pickup_address:addresses(*)")
      .single();

    if (error) throw error;

    await supabase.from("order_status_history").insert({
      order_id: data.id,
      status: "pending",
      note: "Order placed by customer",
      created_by: customerId,
    });

    // In-app notification for customer
    await supabase.from("notifications").insert({
      user_id: customerId,
      title: `🧺 Order ${data.order_number} Placed!`,
      body: `Your pickup is scheduled for ${booking.scheduled_date} (${booking.scheduled_time}). A rider will be assigned shortly.`,
      type: "order_update",
      order_id: data.id,
    });

    // Trigger email receipt edge function (non-blocking — don't await)
    supabase.functions
      .invoke("send-order-email", { body: { order_id: data.id } })
      .catch(() => {});

    return data;
  },

  async getCustomerOrders(customerId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "*, shop:shop_profiles(id,shop_name,logo_url,address), pickup_address:addresses(*), rating:order_ratings(*)",
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getShopOrders(shopId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "*, customer:users(id,full_name,phone,avatar_url), pickup_address:addresses(*)",
      )
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getRiderOrders(riderId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "*, shop:shop_profiles(id,shop_name,address,lat,lng), pickup_address:addresses(*)",
      )
      .eq("rider_id", riderId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "*, customer:users(id,full_name,phone,avatar_url), shop:shop_profiles(*), rider:rider_profiles(id,vehicle_type,vehicle_plate,current_lat,current_lng,user:users(full_name,phone,avatar_url)), pickup_address:addresses(*), status_history:order_status_history(*), rating:order_ratings(*)",
      )
      .eq("id", orderId)
      .single();
    if (error) return null;
    return data;
  },

  async getAllOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select("*, customer:users(full_name), shop:shop_profiles(shop_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    updatedBy: string,
    note?: string,
  ) {
    const { error } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw error;
    await supabase
      .from("order_status_history")
      .insert({ order_id: orderId, status, note, created_by: updatedBy });

    // Push in-app notification to customer
    const STATUS_NOTIFS: Partial<
      Record<OrderStatus, { title: string; body: string }>
    > = {
      rider_assigned: {
        title: "🛵 Rider Assigned!",
        body: "A rider has been assigned and will head to you shortly.",
      },
      rider_on_way_pickup: {
        title: "📍 Rider is on the Way!",
        body: "Your rider is heading to your pickup address now.",
      },
      picked_up: {
        title: "📦 Laundry Picked Up!",
        body: "Your laundry has been collected and is heading to the shop.",
      },
      confirmed: {
        title: "🏪 Arrived at Shop",
        body: "Your laundry has been dropped off at the laundry shop.",
      },
      washing: {
        title: "🫧 Washing in Progress",
        body: "Your laundry is currently being washed and processed.",
      },
      ready_for_delivery: {
        title: "✨ Laundry Ready!",
        body: "Your laundry is clean and ready. The rider will pick it up soon.",
      },
      rider_on_way_delivery: {
        title: "🚀 Out for Delivery!",
        body: "Your clean laundry is on its way back to you!",
      },
      delivered: {
        title: "🎉 Delivered!",
        body: "Your laundry has been delivered. Enjoy fresh clothes! ⭐ Don't forget to rate your experience.",
      },
      cancelled: {
        title: "❌ Order Cancelled",
        body: "Your order has been cancelled.",
      },
    };

    const msg = STATUS_NOTIFS[status];
    if (msg) {
      // Get customer_id for this order
      const { data: orderRow } = await supabase
        .from("orders")
        .select("customer_id")
        .eq("id", orderId)
        .single();
      if (orderRow?.customer_id) {
        await supabase.from("notifications").insert({
          user_id: orderRow.customer_id,
          title: msg.title,
          body: msg.body,
          type: "order_update",
          order_id: orderId,
        });
      }
    }
  },

  async assignRider(orderId: string, riderId: string) {
    const { error } = await supabase
      .from("orders")
      .update({
        rider_id: riderId,
        status: "rider_assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (error) throw error;
  },

  async submitRating(
    orderId: string,
    customerId: string,
    shopRating: number,
    riderRating: number | null,
    shopComment: string,
    riderComment: string,
  ) {
    const { error } = await supabase.from("order_ratings").insert({
      order_id: orderId,
      customer_id: customerId,
      shop_rating: shopRating,
      rider_rating: riderRating,
      shop_comment: shopComment,
      rider_comment: riderComment,
    });
    if (error) throw error;
  },

  subscribeToOrder(orderId: string, callback: (order: Partial<Order>) => void) {
    return supabase
      .channel(`order:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => callback(payload.new as Partial<Order>),
      )
      .subscribe();
  },
};
