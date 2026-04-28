import supabase from "./supabase";
import { Order, OrderStatus, BookingState } from "../types";
import { APP_CONFIG } from "../constants";

export const orderService = {
  async createOrder(customerId: string, booking: BookingState): Promise<Order> {
    const service = booking.selected_shop?.services?.find(
      (s) => s.service_type === booking.service_type,
    );
    if (!service) throw new Error("Service not found");

    // pickup_address.id is the FK to addresses table
    const pickupAddressId = booking.pickup_address?.id;
    if (!pickupAddressId) throw new Error("Please select a pickup address");

    const orderNumber = `LL-${Date.now().toString().slice(-8)}`;

    // Parse time slot like "02:00 PM – 04:00 PM" → take start time only
    const startTime = booking.scheduled_time
      ? booking.scheduled_time.split(/[–\-]/)[0].trim()
      : "08:00 AM";
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
    const validPickup = isNaN(pickupDate.getTime())
      ? new Date(`${booking.scheduled_date}T12:00:00`)
      : pickupDate;
    const estCompletion = new Date(
      validPickup.getTime() + service.estimated_hours * 3600000,
    );

    const subtotal = service.price_per_kg * booking.estimated_weight_kg;
    // Calculate delivery fee from shop distance (already on selected_shop after getNearbyShops)
    const distKm = booking.selected_shop?.distance_km ?? 3;
    const deliveryFee =
      APP_CONFIG.deliveryFeeBase + distKm * APP_CONFIG.deliveryFeePerKm;
    const totalAmount = subtotal + deliveryFee;

    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        shop_id: booking.selected_shop!.id,
        pickup_address_id: pickupAddressId, // ← use id from pickup_address object
        service_type: booking.service_type,
        status: "pending",
        bag_count: booking.bag_count,
        estimated_weight_kg: booking.estimated_weight_kg,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        payment_method: booking.payment_method,
        payment_status: "pending",
        scheduled_pickup_date: booking.scheduled_date,
        scheduled_pickup_time: booking.scheduled_time,
        estimated_completion: estCompletion.toISOString(),
        order_number: orderNumber,
        special_instructions: booking.special_instructions ?? "",
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("order_status_history").insert({
      order_id: data.id,
      status: "pending",
      note: "Order placed by customer",
      created_by: customerId,
    });

    // Trigger email non-blocking
    supabase.functions
      .invoke("send-order-email", { body: { order_id: data.id } })
      .catch(() => {});

    return data;
  },

  async getCustomerOrders(customerId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "*, shop:shop_profiles(id,shop_name,logo_url,address,lat,lng), pickup_address:addresses(*), rating:order_ratings(*)",
      )
      .eq("customer_id", customerId)
      .neq("is_hidden_by_customer", true)
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
        `
        *,
        shop:shop_profiles(id,shop_name,address,lat,lng),
        pickup_address:addresses(id,full_address,city,barangay,lat,lng),
        customer:users(id,full_name,phone)
      `,
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
        `
        *,
        customer:users(id,full_name,phone,avatar_url),
        shop:shop_profiles(id,shop_name,address,lat,lng,logo_url,phone),
        rider:rider_profiles(id,vehicle_type,vehicle_plate,current_lat,current_lng,user:users(full_name,phone,avatar_url)),
        pickup_address:addresses(*),
        status_history:order_status_history(*),
        rating:order_ratings(*)
      `,
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
    const updates: any = { status, updated_at: new Date().toISOString() };

    // Auto-mark COD as paid when delivered
    if (status === "delivered") {
      // Get order to check payment method
      const { data: ord } = await supabase
        .from("orders")
        .select("payment_method, rider_id")
        .eq("id", orderId)
        .single();
      if (ord?.payment_method === "cash_on_delivery") {
        updates.payment_status = "paid"; // rider collected cash on delivery
      }
      // Increment rider delivery count
      if (ord?.rider_id) {
        await supabase
          .rpc("increment_rider_deliveries", { rider_id: ord.rider_id })
          .then(async ({ error: rpcErr }) => {
            if (rpcErr) {
              // Fallback if RPC not deployed yet — manual increment
              const { data: rp } = await supabase
                .from("rider_profiles")
                .select("total_deliveries")
                .eq("id", ord.rider_id)
                .single();
              if (rp) {
                await supabase
                  .from("rider_profiles")
                  .update({ total_deliveries: (rp.total_deliveries ?? 0) + 1 })
                  .eq("id", ord.rider_id);
              }
            }
          });
      }
    }

    const { error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId);
    if (error) throw error;

    // Insert status history — created_by must be a users.id (not rider_profile.id)
    // We try/catch so a history log failure never blocks the actual status update
    await supabase
      .from("order_status_history")
      .insert({
        order_id: orderId,
        status,
        note: note ?? `Status changed to ${status}`,
        created_by: updatedBy, // caller must pass users.id — see callers below
      })
      .then(({ error: e }) => {
        if (e)
          console.warn("Status history insert failed (non-fatal):", e.message);
      });

    // NOTE: Do NOT insert notifications here — the DB trigger
    // (trg_notify_on_order_status) handles that server-side.
    // Inserting here too causes duplicate notifications.
  },

  async assignRider(orderId: string, riderProfileId: string) {
    // Pre-check: confirm order is still pending and unassigned
    const { data: check } = await supabase
      .from("orders")
      .select("status, rider_id")
      .eq("id", orderId)
      .single();

    if (!check) throw new Error("Order not found");
    if (check.status !== "pending")
      throw new Error("Order no longer available");
    if (check.rider_id) throw new Error("Order already taken by another rider");

    // Update order — rider claiming it
    const { error } = await supabase
      .from("orders")
      .update({
        rider_id: riderProfileId,
        status: "rider_assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("status", "pending")
      .is("rider_id", null);

    if (error) throw error;

    // Get the rider's user_id (NOT profile id) for the created_by FK reference
    const { data: riderProfile } = await supabase
      .from("rider_profiles")
      .select("user_id")
      .eq("id", riderProfileId)
      .single();

    await supabase
      .from("order_status_history")
      .insert({
        order_id: orderId,
        status: "rider_assigned",
        note: "Rider accepted the order",
        created_by: riderProfile?.user_id ?? null, // user_id, not profile id
      })
      .then(({ error: e }) => {
        if (e) console.warn("History log failed:", e.message);
      });
    // Note: we don't throw here — the important part (order assignment) already succeeded
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

  subscribeToOrder(
    orderId: string,
    callback: (updated: Partial<Order>) => void,
  ) {
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
