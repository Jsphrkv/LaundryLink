// supabase/functions/send-order-email/index.ts
// Deploy: supabase functions deploy send-order-email
// Triggered via HTTP POST from order.service.ts after order creation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  try {
    const { order_id } = await req.json();
    if (!order_id) return new Response("Missing order_id", { status: 400 });

    // Fetch full order details
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        customer:users(full_name, email, phone),
        shop:shop_profiles(shop_name, address, phone),
        pickup_address:addresses(full_address, city)
      `,
      )
      .eq("id", order_id)
      .single();

    if (error || !order)
      return new Response("Order not found", { status: 404 });

    const SERVICE_LABELS: Record<string, string> = {
      wash_fold: "Wash & Fold",
      wash_dry: "Wash & Dry",
      express: "Express",
      dry_clean: "Dry Clean",
      ironing: "Ironing",
    };

    const customerEmail = order.customer?.email;
    if (!customerEmail)
      return new Response("No customer email", { status: 200 });

    // Build HTML email
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background: #f5f7fa; margin: 0; padding: 20px; }
    .card { background: white; border-radius: 16px; max-width: 520px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #0F52BA, #3A7BD5); padding: 28px 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .header p  { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 28px 32px; }
    .order-num { background: #f0f4ff; border-radius: 10px; padding: 14px 20px; text-align: center; margin-bottom: 24px; }
    .order-num p { margin: 0; font-size: 13px; color: #6b7280; }
    .order-num h2 { margin: 4px 0 0; font-size: 22px; color: #0F52BA; letter-spacing: 1px; }
    .section { margin-bottom: 20px; }
    .section h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; margin: 0 0 10px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .row .label { color: #6b7280; }
    .row .value { font-weight: 600; color: #111827; }
    .total-row { display: flex; justify-content: space-between; padding: 14px 18px; background: #f0f4ff; border-radius: 10px; margin-top: 12px; }
    .total-row .label { font-weight: 700; color: #374151; }
    .total-row .value { font-size: 20px; font-weight: 800; color: #0F52BA; }
    .footer { text-align: center; padding: 20px 32px; background: #f9fafb; font-size: 12px; color: #9ca3af; }
    .badge { display: inline-block; background: #dcfce7; color: #16a34a; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🧺 LaundryLink</h1>
      <p>Your booking is confirmed!</p>
    </div>
    <div class="body">
      <span class="badge">✅ Order Confirmed</span>
      <p style="font-size:15px;color:#374151;margin:0 0 20px">
        Hi <strong>${order.customer?.full_name}</strong>, your laundry pickup has been booked successfully.
        A rider will collect your laundry and bring it to the shop.
      </p>

      <div class="order-num">
        <p>Your Order Number</p>
        <h2>${order.order_number}</h2>
      </div>

      <div class="section">
        <h3>Order Details</h3>
        <div class="row"><span class="label">Service</span><span class="value">${SERVICE_LABELS[order.service_type] ?? order.service_type}</span></div>
        <div class="row"><span class="label">Bags</span><span class="value">${order.bag_count} bag${order.bag_count > 1 ? "s" : ""}</span></div>
        <div class="row"><span class="label">Est. Weight</span><span class="value">~${order.estimated_weight_kg} kg</span></div>
        <div class="row"><span class="label">Pickup Date</span><span class="value">${order.scheduled_pickup_date}</span></div>
        <div class="row"><span class="label">Pickup Time</span><span class="value">${order.scheduled_pickup_time}</span></div>
        <div class="row"><span class="label">Pickup Address</span><span class="value">${order.pickup_address?.full_address}</span></div>
      </div>

      <div class="section">
        <h3>Laundry Shop</h3>
        <div class="row"><span class="label">Shop</span><span class="value">${order.shop?.shop_name}</span></div>
        <div class="row"><span class="label">Address</span><span class="value">${order.shop?.address}</span></div>
      </div>

      <div class="section">
        <h3>Payment</h3>
        <div class="row"><span class="label">Subtotal</span><span class="value">₱${order.subtotal.toFixed(2)}</span></div>
        <div class="row"><span class="label">Delivery Fee</span><span class="value">₱${order.delivery_fee.toFixed(2)}</span></div>
        <div class="row"><span class="label">Method</span><span class="value">${order.payment_method === "cash_on_delivery" ? "💵 Cash on Delivery" : "📱 GCash"}</span></div>
      </div>

      <div class="total-row">
        <span class="label">Total Amount</span>
        <span class="value">₱${order.total_amount.toFixed(2)}</span>
      </div>
    </div>
    <div class="footer">
      <p>Questions? Contact us at support@laundrylink.ph</p>
      <p>© ${new Date().getFullYear()} LaundryLink — Fresh clothes, delivered to you 🇵🇭</p>
    </div>
  </div>
</body>
</html>`;

    // Send via Supabase's built-in email (uses your SMTP settings)
    const { error: emailError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: customerEmail,
    });

    // Use Resend or another SMTP if configured, otherwise use fetch to a mail API
    // For demo: log the email content (replace with real SMTP in production)
    console.log(`Would send to: ${customerEmail}`);
    console.log("Subject: Your LaundryLink Order Confirmation");

    // If you have Resend configured:
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "LaundryLink <noreply@laundrylink.ph>",
          to: [customerEmail],
          subject: `✅ Order Confirmed — ${order.order_number}`,
          html,
        }),
      });
    }

    // Always save a notification in-app regardless of email
    await supabase.from("notifications").insert({
      user_id: order.customer_id,
      title: `✅ Order ${order.order_number} Confirmed`,
      body: `Your laundry pickup is booked for ${order.scheduled_pickup_date} (${order.scheduled_pickup_time}). A rider will be assigned shortly.`,
      type: "order_update",
      order_id: order_id,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response("Internal error", { status: 500 });
  }
});
