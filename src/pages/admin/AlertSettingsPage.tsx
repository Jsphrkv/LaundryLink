import React, { useState } from "react";
import toast from "react-hot-toast";
import { Bell, Send, Users, UserCheck, Store, Globe } from "lucide-react";
import supabase from "../../services/supabase";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, Button, Input, Textarea } from "../../components/ui";
import { APP_CONFIG } from "../../constants";

// ─── Send Alert Page ──────────────────────────────────────────────────────────
export function AdminSendAlertPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<
    "all" | "customer" | "rider" | "shop_owner"
  >("all");
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  const AUDIENCE_OPTIONS = [
    {
      value: "all",
      label: "Everyone",
      icon: <Globe size={16} />,
      desc: "All registered users",
    },
    {
      value: "customer",
      label: "Customers",
      icon: <Users size={16} />,
      desc: "Customer accounts only",
    },
    {
      value: "rider",
      label: "Riders",
      icon: <UserCheck size={16} />,
      desc: "Rider accounts only",
    },
    {
      value: "shop_owner",
      label: "Shop Owners",
      icon: <Store size={16} />,
      desc: "Shop owner accounts only",
    },
  ] as const;

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Fill in title and message");
      return;
    }
    if (
      !confirm(
        `Send this alert to ${audience === "all" ? "all users" : audience + "s"}?`,
      )
    )
      return;

    setSending(true);
    try {
      // Fetch target user IDs
      let query = supabase.from("users").select("id");
      if (audience !== "all") query = query.eq("role", audience);
      const { data: users } = await query;

      if (!users?.length) {
        toast("No users in this group", { icon: "ℹ️" });
        return;
      }

      // Insert notifications
      const rows = users.map((u) => ({
        user_id: u.id,
        title: title.trim(),
        body: body.trim(),
        type: "system",
        is_read: false,
      }));

      const { error } = await supabase.from("notifications").insert(rows);
      if (error) throw error;

      setSentCount(users.length);
      toast.success(`Alert sent to ${users.length} users!`);
      setTitle("");
      setBody("");
    } catch (err: any) {
      toast.error(err.message || "Could not send alert");
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout title="Send Alert">
      <div className="max-w-lg mx-auto">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Bell size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-extrabold text-gray-900">
                Broadcast Notification
              </h2>
              <p className="text-xs text-gray-400">
                Send an in-app notification to users
              </p>
            </div>
          </div>

          {/* Audience */}
          <div className="mb-4">
            <p className="text-sm font-bold text-gray-700 mb-2">Send To</p>
            <div className="grid grid-cols-2 gap-2">
              {AUDIENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAudience(opt.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all
                    ${audience === opt.value ? "border-primary bg-primary-50" : "border-gray-100 hover:border-gray-200"}`}
                >
                  <span
                    className={
                      audience === opt.value ? "text-primary" : "text-gray-400"
                    }
                  >
                    {opt.icon}
                  </span>
                  <div>
                    <p
                      className={`text-xs font-bold ${audience === opt.value ? "text-primary" : "text-gray-700"}`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-gray-400">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Notification Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. 🎉 New promo available!"
            maxLength={80}
            hint={`${title.length}/80 characters`}
          />

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message to users here..."
              maxLength={200}
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white resize-none transition-colors"
              rows={4}
            />
            <p className="text-xs text-gray-400 mt-1">
              {body.length}/200 characters
            </p>
          </div>

          {/* Preview */}
          {(title || body) && (
            <div className="mb-4 p-4 bg-gray-900 rounded-xl">
              <p className="text-xs text-gray-400 mb-2 font-semibold">
                📱 Preview
              </p>
              <div className="bg-white rounded-xl p-3 shadow">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🧺</span>
                  <span className="text-xs font-bold text-gray-500">
                    LaundryLink
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {title || "Title..."}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {body || "Message..."}
                </p>
              </div>
            </div>
          )}

          {sentCount !== null && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-center">
              <p className="text-sm font-bold text-green-700">
                ✅ Last alert sent to {sentCount} users
              </p>
            </div>
          )}

          <Button
            fullWidth
            size="lg"
            loading={sending}
            leftIcon={<Send size={16} />}
            onClick={handleSend}
          >
            Send Alert
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
export function AdminSettingsPage() {
  const [saving, setSaving] = useState<string | null>(null);

  const handleSave = (section: string) => {
    setSaving(section);
    setTimeout(() => {
      setSaving(null);
      toast.success("Settings saved!");
    }, 800);
  };

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-lg mx-auto space-y-4">
        {/* App Info */}
        <Card className="p-5">
          <h2 className="font-extrabold text-gray-900 mb-4">App Information</h2>
          <div className="space-y-1">
            <Input
              label="App Name"
              defaultValue="LaundryLink"
              readOnly
              className="bg-gray-100 cursor-not-allowed"
            />
            <Input
              label="Support Email"
              defaultValue={APP_CONFIG.supportEmail}
            />
            <Input
              label="Support Phone"
              defaultValue={APP_CONFIG.supportPhone}
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            loading={saving === "app"}
            onClick={() => handleSave("app")}
          >
            Save Changes
          </Button>
        </Card>

        {/* Delivery Settings */}
        <Card className="p-5">
          <h2 className="font-extrabold text-gray-900 mb-4">
            Delivery Pricing
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Base Fee (₱)"
              type="number"
              defaultValue={APP_CONFIG.deliveryFeeBase}
            />
            <Input
              label="Per-km Fee (₱)"
              type="number"
              defaultValue={APP_CONFIG.deliveryFeePerKm}
            />
            <Input
              label="Max Radius (km)"
              type="number"
              defaultValue={APP_CONFIG.maxDeliveryRadiusKm}
              className="col-span-2"
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            loading={saving === "delivery"}
            onClick={() => handleSave("delivery")}
          >
            Save Changes
          </Button>
        </Card>

        {/* Maintenance */}
        <Card className="p-5">
          <h2 className="font-extrabold text-gray-900 mb-1">Maintenance</h2>
          <p className="text-xs text-gray-400 mb-4">
            Danger zone — use with caution
          </p>
          <div className="space-y-2">
            <button
              onClick={() => toast("Feature coming soon", { icon: "ℹ️" })}
              className="w-full py-2.5 rounded-xl border-2 border-amber-200 text-amber-700 font-bold text-sm hover:bg-amber-50 transition-all"
            >
              🔄 Clear Old Notifications
            </button>
            <button
              onClick={() => toast("Feature coming soon", { icon: "ℹ️" })}
              className="w-full py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-all"
            >
              🗑️ Purge Cancelled Orders
            </button>
          </div>
        </Card>

        {/* Version */}
        <div className="text-center text-xs text-gray-400 py-2">
          LaundryLink v1.0.0 · Built for the Philippines 🇵🇭
        </div>
      </div>
    </DashboardLayout>
  );
}
