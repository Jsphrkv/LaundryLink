import supabase from "./supabase";
import { Address } from "../types";
import { APP_CONFIG } from "../constants";

// No API key, no token, no signup needed.
// Nominatim is OpenStreetMap's free geocoding service.
const NOMINATIM = "https://nominatim.openstreetmap.org";

// Required by Nominatim's usage policy — identify your app
const HEADERS = { "User-Agent": "LaundryLink/1.0 (student-capstone)" };

export const addressService = {
  async getUserAddresses(userId: string): Promise<Address[]> {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async addAddress(
    userId: string,
    address: Omit<Address, "id" | "user_id">,
  ): Promise<Address> {
    const existing = await addressService.getUserAddresses(userId);
    const isDefault = existing.length === 0 || address.is_default;
    if (isDefault) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId);
    }
    const { data, error } = await supabase
      .from("addresses")
      .insert({ ...address, user_id: userId, is_default: isDefault })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateAddress(
    addressId: string,
    updates: Partial<Address>,
  ): Promise<Address> {
    const { data, error } = await supabase
      .from("addresses")
      .update(updates)
      .eq("id", addressId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAddress(addressId: string) {
    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", addressId);
    if (error) throw error;
  },

  async setDefault(userId: string, addressId: string) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", userId);
    const { error } = await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", addressId);
    if (error) throw error;
  },

  // Converts a full address string to lat/lng — no API key needed
  async geocodeAddress(
    address: string,
  ): Promise<{ lat: number; lng: number } | null> {
    const encoded = encodeURIComponent(`${address}, Philippines`);
    const url = `${NOMINATIM}/search?q=${encoded}&format=json&limit=1&countrycodes=ph`;
    try {
      const res = await fetch(url, { headers: HEADERS });
      const json = await res.json();
      if (!json.length) return null;
      return {
        lat: parseFloat(json[0].lat),
        lng: parseFloat(json[0].lon),
      };
    } catch {
      return null;
    }
  },

  // Address autocomplete suggestions while user types — no API key needed
  async searchAddresses(
    query: string,
  ): Promise<{ place_name: string; lat: number; lng: number }[]> {
    if (query.trim().length < 3) return [];
    const encoded = encodeURIComponent(`${query}, Philippines`);
    const url = `${NOMINATIM}/search?q=${encoded}&format=json&limit=5&countrycodes=ph`;
    try {
      const res = await fetch(url, { headers: HEADERS });
      const json = await res.json();
      return json.map((r: any) => ({
        place_name: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      }));
    } catch {
      return [];
    }
  },
};
