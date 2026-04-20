// supabase/functions/notify-order-update/index.ts
// Deploy with: supabase functions deploy notify-order-update

import { serve } from "std/http/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
  confirmed: {
    title: "✅ Order Confirmed",
    body: "Your laundry order has been confirmed!",
  },
  rider_assigned: {
    title: "🛵 Rider Assigned",
    body: "A rider has been assigned to pick up your laundry.",
  },
  rider_on_way_pickup: {
    title: "📍 Rider on the Way",
    body: "Your rider is heading to your address now.",
  },
  picked_up: {
    title: "📦 Laundry Picked Up",
    body: "Your laundry has been picked up!",
  },
  washing: {
    title: "🫧 Washing in Progress",
    body: "Your clothes are being washed now.",
  },
  ready_for_delivery: {
    title: "✨ Ready for Delivery",
    body: "Your laundry is clean and ready!",
  },
  rider_on_way_delivery: {
    title: "🚀 Out for Delivery",
    body: "Your laundry is on the way back to you!",
  },
  delivered: {
    title: "🎉 Delivered!",
    body: "Your laundry has been delivered. Enjoy fresh clothes!",
  },
  cancelled: {
    title: "❌ Order Cancelled",
    body: "Your order has been cancelled.",
  },
};

serve(async (req) => {
  const { order_id, status, customer_id } = await req.json();

  const msg = STATUS_MESSAGES[status];
  if (!msg) return new Response("No message for status", { status: 200 });

  // Save notification to DB
  await supabase.from("notifications").insert({
    user_id: customer_id,
    title: msg.title,
    body: msg.body,
    type: "order_update",
    order_id,
  });

  // Get push token
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", customer_id);

  if (!tokens?.length) return new Response("No push token", { status: 200 });

  // Send Expo push notification
  const messages = tokens.map((t) => ({
    to: t.token,
    title: msg.title,
    body: msg.body,
    data: { order_id, status },
    sound: "default",
  }));

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  return new Response(JSON.stringify({ sent: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
