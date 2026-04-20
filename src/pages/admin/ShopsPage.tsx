import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Search,
  CheckCircle,
  XCircle,
  MapPin,
  Star,
  Phone,
} from "lucide-react";
import supabase from "../../services/supabase";
import { ShopProfile } from "../../types";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import {
  Card,
  PageSpinner,
  Input,
  Button,
  Modal,
  Toggle,
} from "../../components/ui";
import clsx from "clsx";

export default function AdminShopsPage() {
  const [shops, setShops] = useState<
    (ShopProfile & { owner_name?: string; owner_email?: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "verified" | "pending">("all");
  const [selected, setSelected] = useState<(typeof shops)[0] | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shop_profiles")
      .select("*, services:shop_services(*), owner:users(full_name, email)")
      .order("created_at", { ascending: false });

    setShops(
      (data ?? []).map((s: any) => ({
        ...s,
        owner_name: s.owner?.full_name,
        owner_email: s.owner?.email,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = shops.filter((s) => {
    const matchSearch =
      s.shop_name.toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase()) ||
      (s.owner_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "verified" ? s.is_verified : !s.is_verified);
    return matchSearch && matchFilter;
  });

  const toggleVerify = async (shop: (typeof shops)[0]) => {
    setSaving(true);
    try {
      const newVerified = !shop.is_verified;

      // Update shop_profiles
      const { error } = await supabase
        .from("shop_profiles")
        .update({ is_verified: newVerified })
        .eq("id", shop.id);
      if (error) throw error;

      // Also sync users.is_verified so the Users table shows correctly
      await supabase
        .from("users")
        .update({ is_verified: newVerified })
        .eq("id", shop.user_id);

      toast.success(
        newVerified ? "✅ Shop verified!" : "Shop verification revoked",
      );
      setSelected(null);
      await load();
    } catch {
      toast.error("Could not update shop");
    } finally {
      setSaving(false);
    }
  };

  const toggleOpen = async (shop: (typeof shops)[0]) => {
    try {
      await supabase
        .from("shop_profiles")
        .update({ is_open: !shop.is_open })
        .eq("id", shop.id);
      await load();
    } catch {
      toast.error("Could not update status");
    }
  };

  const counts = {
    all: shops.length,
    verified: shops.filter((s) => s.is_verified).length,
    pending: shops.filter((s) => !s.is_verified).length,
  };

  if (loading)
    return (
      <DashboardLayout title="Shops">
        <PageSpinner />
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="Manage Shops">
      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {(["all", "verified", "pending"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all capitalize",
              filter === f
                ? "border-primary bg-primary text-white"
                : "border-gray-200 text-gray-600 hover:border-primary-300",
            )}
          >
            {f === "pending"
              ? `⏳ Pending (${counts.pending})`
              : f === "verified"
                ? `✅ Verified (${counts.verified})`
                : `All (${counts.all})`}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by shop name, address, or owner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={15} />}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((shop) => (
          <Card key={shop.id} className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                🏪
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-extrabold text-gray-900">
                      {shop.shop_name || "(Unnamed Shop)"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Owner: {shop.owner_name ?? "—"} · {shop.owner_email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={clsx(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        shop.is_verified
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {shop.is_verified ? "✅ Verified" : "⏳ Pending"}
                    </span>
                    <span
                      className={clsx(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        shop.is_open
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500",
                      )}
                    >
                      {shop.is_open ? "🟢 Open" : "🔴 Closed"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    {shop.address || "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star size={11} />
                    {shop.rating.toFixed(1)} ({shop.total_reviews} reviews)
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone size={11} />
                    {shop.phone || "—"}
                  </span>
                  <span>🧺 {shop.services?.length ?? 0} services</span>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant={shop.is_verified ? "danger" : "primary"}
                    onClick={() => toggleVerify(shop)}
                  >
                    {shop.is_verified ? "✕ Revoke" : "✅ Verify Shop"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelected(shop)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-4xl mb-3">🏪</p>
            <p className="font-bold text-gray-700">No shops found</p>
          </Card>
        )}
      </div>

      {/* Shop detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Shop Details"
        maxWidth="max-w-lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-semibold">Shop Name</p>
                <p className="font-bold text-gray-900 mt-0.5">
                  {selected.shop_name}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-semibold">Owner</p>
                <p className="font-bold text-gray-900 mt-0.5">
                  {selected.owner_name}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                <p className="text-xs text-gray-400 font-semibold">Address</p>
                <p className="font-bold text-gray-900 mt-0.5">
                  {selected.address || "—"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-semibold">Rating</p>
                <p className="font-bold text-gray-900 mt-0.5">
                  ⭐ {selected.rating.toFixed(1)} ({selected.total_reviews})
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 font-semibold">Services</p>
                <p className="font-bold text-gray-900 mt-0.5">
                  {selected.services?.length ?? 0} services listed
                </p>
              </div>
            </div>

            {/* Services list */}
            {selected.services?.length > 0 && (
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2">
                  Services Offered
                </p>
                <div className="space-y-1">
                  {selected.services.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
                    >
                      <span className="font-semibold text-gray-700 capitalize">
                        {s.service_type.replace("_", " ")}
                      </span>
                      <span className="text-primary font-bold">
                        ₱{s.price_per_kg}/kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-bold text-gray-700">
                  Shop Open Status
                </p>
                <p className="text-xs text-gray-400">
                  Toggle whether shop appears open to customers
                </p>
              </div>
              <Toggle
                checked={selected.is_open}
                onChange={() => {
                  toggleOpen(selected);
                  setSelected((prev) =>
                    prev ? { ...prev, is_open: !prev.is_open } : prev,
                  );
                }}
              />
            </div>

            <Button
              fullWidth
              variant={selected.is_verified ? "danger" : "primary"}
              loading={saving}
              leftIcon={
                selected.is_verified ? (
                  <XCircle size={16} />
                ) : (
                  <CheckCircle size={16} />
                )
              }
              onClick={() => toggleVerify(selected)}
            >
              {selected.is_verified
                ? "Revoke Verification"
                : "Verify This Shop"}
            </Button>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
