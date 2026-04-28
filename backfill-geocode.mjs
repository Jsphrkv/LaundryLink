/**
 * backfill-geocode.mjs
 * One-time script to geocode all addresses that have missing/zero coordinates.
 *
 * Usage:
 *   1. Copy this file to your project root (D:\laundrylink-web\)
 *   2. Create a .env.local or set these env vars:
 *        VITE_SUPABASE_URL=https://xxxx.supabase.co
 *        VITE_SUPABASE_ANON_KEY=your-anon-key
 *   3. Run:  node backfill-geocode.mjs
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const NOMINATIM    = "https://nominatim.openstreetmap.org";

// Nominatim requires a User-Agent header
const HEADERS = { "User-Agent": "LaundryLink/1.0 (student-capstone)" };

// Nominatim rate limit: max 1 request/second — do NOT remove this delay
const DELAY_MS = 1100;

// ── Setup ─────────────────────────────────────────────────────────────────────
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocode(fullAddress) {
  const encoded = encodeURIComponent(`${fullAddress}, Philippines`);
  const url = `${NOMINATIM}/search?q=${encoded}&format=json&limit=1&countrycodes=ph`;
  try {
    const res  = await fetch(url, { headers: HEADERS });
    const json = await res.json();
    if (!json.length) return null;
    return {
      lat: parseFloat(json[0].lat),
      lng: parseFloat(json[0].lon),
    };
  } catch (err) {
    console.warn(`  ⚠️  Fetch error: ${err.message}`);
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍  Fetching addresses with missing coordinates...\n");

  // Grab all addresses where lat/lng is null or 0
  const { data: addresses, error } = await supabase
    .from("addresses")
    .select("id, full_address, lat, lng")
    .or("lat.is.null,lng.is.null,lat.eq.0,lng.eq.0");

  if (error) {
    console.error("❌  Supabase error:", error.message);
    process.exit(1);
  }

  if (!addresses.length) {
    console.log("✅  All addresses already have coordinates. Nothing to do.");
    return;
  }

  console.log(`Found ${addresses.length} address(es) to geocode.\n`);

  let success = 0;
  let failed  = 0;

  for (const addr of addresses) {
    console.log(`📍  [${addr.id}] "${addr.full_address}"`);

    const coords = await geocode(addr.full_address);

    if (!coords) {
      console.log("  ❌  Could not geocode — skipping.\n");
      failed++;
    } else {
      const { error: updateError } = await supabase
        .from("addresses")
        .update({ lat: coords.lat, lng: coords.lng })
        .eq("id", addr.id);

      if (updateError) {
        console.log(`  ❌  DB update failed: ${updateError.message}\n`);
        failed++;
      } else {
        console.log(`  ✅  Updated → lat: ${coords.lat}, lng: ${coords.lng}\n`);
        success++;
      }
    }

    // Respect Nominatim's 1 req/sec rate limit
    await sleep(DELAY_MS);
  }

  console.log("─────────────────────────────────");
  console.log(`✅  Success: ${success}`);
  console.log(`❌  Failed:  ${failed}`);
  console.log(`📦  Total:   ${addresses.length}`);
}

main();
