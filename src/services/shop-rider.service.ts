// ─── shop.service.ts ─────────────────────────────────────────────────────────
import supabase from "./supabase";
import { ShopProfile, ShopFilter, ServiceType } from "../types";

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const shopService = {
  async getNearbyShops(
    userLat: number,
    userLng: number,
    filter: ShopFilter = "nearest",
    serviceType?: ServiceType,
    radiusKm = 9999, // effectively no radius limit — show all open shops
  ): Promise<ShopProfile[]> {
    const { data, error } = await supabase
      .from("shop_profiles")
      .select("*, services:shop_services(*)")
      // Removed is_verified filter: show all open shops so customers can book
      // even before admin formally verifies (common in early-stage apps)
      .eq("is_open", true)
      .neq("shop_name", ""); // must have a name set
    if (error) throw error;

    let shops: ShopProfile[] = (data ?? [])
      .map((s) => {
        // Shops saved with default coords (0,0) show as 0 km away
        // so they always appear instead of being 15,000 km out
        const hasValidCoords = s.lat !== 0 || s.lng !== 0;
        const distance_km = hasValidCoords
          ? haversineKm(userLat, userLng, s.lat, s.lng)
          : 0;
        return { ...s, distance_km };
      })
      .filter((s) => s.distance_km <= radiusKm);

    if (serviceType) {
      // Only filter by service type if the shop has services listed;
      // if no services at all, still show the shop so it's selectable
      shops = shops.filter(
        (s) =>
          !s.services?.length ||
          s.services.some(
            (sv) => sv.service_type === serviceType && sv.is_available,
          ),
      );
    }

    switch (filter) {
      case "nearest":
        shops.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
        break;
      case "cheapest":
        shops.sort(
          (a, b) =>
            Math.min(...(a.services || []).map((s) => s.price_per_kg)) -
            Math.min(...(b.services || []).map((s) => s.price_per_kg)),
        );
        break;
      case "fastest":
        shops.sort(
          (a, b) =>
            Math.min(...(a.services || []).map((s) => s.estimated_hours)) -
            Math.min(...(b.services || []).map((s) => s.estimated_hours)),
        );
        break;
    }
    return shops;
  },

  async getShopById(shopId: string): Promise<ShopProfile | null> {
    const { data, error } = await supabase
      .from("shop_profiles")
      .select("*, services:shop_services(*)")
      .eq("id", shopId)
      .single();
    if (error) return null;
    return data;
  },

  async getMyShop(userId: string): Promise<ShopProfile | null> {
    const { data } = await supabase
      .from("shop_profiles")
      .select("*, services:shop_services(*)")
      .eq("user_id", userId)
      .single();
    return data ?? null;
  },

  async updateShop(shopId: string, updates: Partial<ShopProfile>) {
    const { data, error } = await supabase
      .from("shop_profiles")
      .update(updates)
      .eq("id", shopId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async toggleShopStatus(shopId: string, isOpen: boolean) {
    const { error } = await supabase
      .from("shop_profiles")
      .update({ is_open: isOpen })
      .eq("id", shopId);
    if (error) throw error;
  },

  async getAllShops(): Promise<ShopProfile[]> {
    const { data, error } = await supabase
      .from("shop_profiles")
      .select("*, services:shop_services(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

// ─── rider.service.ts ─────────────────────────────────────────────────────────
import { RiderProfile } from "../types";

export const riderService = {
  async getRiderProfile(userId: string): Promise<RiderProfile | null> {
    const { data } = await supabase
      .from("rider_profiles")
      .select("*, user:users(full_name,phone,avatar_url)")
      .eq("user_id", userId)
      .single();
    return data ?? null;
  },

  async updateRiderProfile(riderId: string, updates: Partial<RiderProfile>) {
    const { data, error } = await supabase
      .from("rider_profiles")
      .update(updates)
      .eq("id", riderId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async setOnlineStatus(riderId: string, status: RiderProfile["status"]) {
    const { error } = await supabase
      .from("rider_profiles")
      .update({ status })
      .eq("id", riderId);
    if (error) throw error;
  },

  async updateLocation(riderId: string, lat: number, lng: number) {
    const { error } = await supabase
      .from("rider_profiles")
      .update({ current_lat: lat, current_lng: lng })
      .eq("id", riderId);
    if (error) throw error;
  },

  async getAvailableOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "*, shop:shop_profiles(id,shop_name,address,lat,lng), pickup_address:addresses(full_address,lat,lng)",
      )
      // Riders see PENDING orders — they pick up from customer and deliver to shop
      .eq("status", "pending")
      .is("rider_id", null)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  subscribeToRiderLocation(
    riderId: string,
    callback: (lat: number, lng: number) => void,
  ) {
    return supabase
      .channel(`rider_location:${riderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rider_profiles",
          filter: `id=eq.${riderId}`,
        },
        (payload) => {
          const { current_lat, current_lng } = payload.new as RiderProfile;
          if (current_lat && current_lng) callback(current_lat, current_lng);
        },
      )
      .subscribe();
  },

  // Browser Geolocation API — replaces expo-location
  watchLocation(onUpdate: (lat: number, lng: number) => void): number | null {
    if (!navigator.geolocation) return null;
    const id = navigator.geolocation.watchPosition(
      (pos) => onUpdate(pos.coords.latitude, pos.coords.longitude),
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 },
    );
    return id;
  },

  stopWatchingLocation(watchId: number) {
    navigator.geolocation.clearWatch(watchId);
  },
};
