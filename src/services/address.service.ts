import supabase from "./supabase";
import { Address } from "../types";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = "LaundryLink/1.0 (student-capstone-project)";

// Geocode cache so we don't re-request the same address
const geoCache = new Map<string, { lat: number; lng: number } | null>();

export const addressService = {
  async getUserAddresses(userId: string): Promise<Address[]> {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .neq("is_deleted", true)
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
    if (isDefault)
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId);

    // Auto-geocode so map pins are accurate immediately
    let lat = address.lat ?? 0;
    let lng = address.lng ?? 0;
    if ((lat === 0 || !lat) && address.full_address) {
      const geo = await addressService.geocodeAddress(address.full_address);
      if (geo) {
        lat = geo.lat;
        lng = geo.lng;
      }
    }

    const { data, error } = await supabase
      .from("addresses")
      .insert({ ...address, user_id: userId, is_default: isDefault, lat, lng })
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
    // Soft-delete: set is_deleted=true instead of hard delete
    // Hard delete fails when address is referenced by orders.pickup_address_id (FK constraint)
    const { error } = await supabase
      .from("addresses")
      .update({ is_deleted: true, is_default: false })
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

  // Geocode Philippine address text → lat/lng
  // Strategy: try structured query first (most accurate), fall back to freeform
  async geocodeAddress(
    address: string,
  ): Promise<{ lat: number; lng: number } | null> {
    const cacheKey = address.toLowerCase().trim();
    if (geoCache.has(cacheKey)) return geoCache.get(cacheKey) ?? null;

    const result = await geocodePH(address);
    geoCache.set(cacheKey, result);
    return result;
  },

  // Autocomplete while user types
  async searchAddresses(
    query: string,
  ): Promise<{ place_name: string; lat: number; lng: number }[]> {
    if (query.trim().length < 4) return [];
    try {
      const params = new URLSearchParams({
        q: `${query.trim()}, Philippines`,
        format: "json",
        limit: "6",
        countrycodes: "ph",
        addressdetails: "1",
        "accept-language": "en",
      });
      const res = await fetch(`${NOMINATIM}/search?${params}`, {
        headers: { "User-Agent": UA },
      });
      const json = await res.json();
      if (!Array.isArray(json)) return [];
      return json
        .filter((r: any) => parseFloat(r.lat) !== 0)
        .map((r: any) => ({
          place_name: r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        }));
    } catch {
      return [];
    }
  },
};

// ─── Internal geocoder ────────────────────────────────────────────────────────
async function geocodePH(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  // Clean up the address
  const cleaned = address
    .replace(/\bParañaque\b/gi, "Paranaque") // Nominatim handles both but ASCII is safer
    .trim();

  // Strategy 1: structured query with city hint
  const city = extractCity(cleaned);
  const structured = city
    ? { street: cleaned, city, country: "Philippines" }
    : null;

  if (structured) {
    const result = await nominatimQuery({
      ...structured,
      format: "json",
      limit: "1",
      countrycodes: "ph",
      "accept-language": "en",
    });
    if (result) return result;
  }

  // Strategy 2: freeform with Philippines appended
  const result2 = await nominatimQuery({
    q: cleaned.toLowerCase().includes("philippines")
      ? cleaned
      : `${cleaned}, Philippines`,
    format: "json",
    limit: "1",
    countrycodes: "ph",
    "accept-language": "en",
  });
  if (result2) return result2;

  // Strategy 3: strip street number and try just barangay/city
  const fallback = cleaned.replace(/^\d+[\w\s]*,\s*/, "");
  return await nominatimQuery({
    q: `${fallback}, Philippines`,
    format: "json",
    limit: "1",
    countrycodes: "ph",
    "accept-language": "en",
  });
}

async function nominatimQuery(
  params: Record<string, string>,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const qs = new URLSearchParams(params);
    const res = await fetch(`${NOMINATIM}/search?${qs}`, {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!Array.isArray(json) || json.length === 0) return null;
    const lat = parseFloat(json[0].lat);
    const lng = parseFloat(json[0].lon);
    if (isNaN(lat) || isNaN(lng) || lat === 0) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

// Extract city/municipality hint from Philippine address string
function extractCity(address: string): string | null {
  const cities = [
    "Paranaque",
    "Parañaque",
    "Las Pinas",
    "Las Piñas",
    "Makati",
    "Manila",
    "Pasay",
    "Taguig",
    "Muntinlupa",
    "Pasig",
    "Mandaluyong",
    "Marikina",
    "Quezon City",
    "Caloocan",
    "Malabon",
    "Navotas",
    "Valenzuela",
    "Pateros",
    "San Juan",
  ];
  for (const c of cities) {
    if (address.toLowerCase().includes(c.toLowerCase())) return c;
  }
  return null;
}
