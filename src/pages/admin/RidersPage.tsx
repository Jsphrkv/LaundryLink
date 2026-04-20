import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Search, CheckCircle, XCircle } from "lucide-react";
import supabase from "../../services/supabase";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, PageSpinner, Input, Button, Modal } from "../../components/ui";
import clsx from "clsx";

const VEHICLE_EMOJI: Record<string, string> = {
  motorcycle: "🛵",
  bicycle: "🚲",
  tricycle: "🛺",
};
const STATUS_COLOR: Record<string, string> = {
  online: "bg-green-100 text-green-700",
  offline: "bg-gray-100 text-gray-500",
  on_delivery: "bg-blue-100 text-blue-700",
};

export default function AdminRidersPage() {
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "verified" | "pending" | "online"
  >("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("rider_profiles")
      .select("*, user:users(full_name, email, phone, is_verified)")
      .order("created_at", { ascending: false });
    setRiders(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = riders.filter((r) => {
    const name = r.user?.full_name ?? "";
    const email = r.user?.email ?? "";
    const matchSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      (r.vehicle_plate ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all"
        ? true
        : filter === "verified"
          ? r.is_kyc_verified
          : filter === "pending"
            ? !r.is_kyc_verified
            : filter === "online"
              ? r.status === "online"
              : true;
    return matchSearch && matchFilter;
  });

  const counts = {
    all: riders.length,
    verified: riders.filter((r) => r.is_kyc_verified).length,
    pending: riders.filter((r) => !r.is_kyc_verified).length,
    online: riders.filter((r) => r.status === "online").length,
  };

  const toggleKYC = async (rider: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("rider_profiles")
        .update({ is_kyc_verified: !rider.is_kyc_verified })
        .eq("id", rider.id);
      if (error) throw error;

      // Also update user is_verified
      await supabase
        .from("users")
        .update({ is_verified: !rider.is_kyc_verified })
        .eq("id", rider.user_id);

      toast.success(
        rider.is_kyc_verified ? "KYC revoked" : "✅ Rider KYC verified!",
      );
      setSelected(null);
      await load();
    } catch {
      toast.error("Could not update rider");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <DashboardLayout title="Riders">
        <PageSpinner />
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="Manage Riders">
      <div className="flex gap-2 mb-5 flex-wrap">
        {(["all", "pending", "verified", "online"] as const).map((f) => (
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
            {f === "all"
              ? `All (${counts.all})`
              : f === "pending"
                ? `⏳ Pending KYC (${counts.pending})`
                : f === "verified"
                  ? `✅ Verified (${counts.verified})`
                  : `🟢 Online (${counts.online})`}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search by name, email, or plate number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={15} />}
        />
      </div>

      <div className="space-y-3">
        {filtered.map((rider) => (
          <Card key={rider.id} className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl shrink-0">
                {VEHICLE_EMOJI[rider.vehicle_type] ?? "🛵"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="font-extrabold text-gray-900">
                      {rider.user?.full_name ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400">{rider.user?.email}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span
                      className={clsx(
                        "text-xs font-bold px-2 py-0.5 rounded-full capitalize",
                        STATUS_COLOR[rider.status] ??
                          "bg-gray-100 text-gray-500",
                      )}
                    >
                      {rider.status === "online"
                        ? "🟢"
                        : rider.status === "on_delivery"
                          ? "🚚"
                          : "🔴"}{" "}
                      {rider.status}
                    </span>
                    <span
                      className={clsx(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        rider.is_kyc_verified
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {rider.is_kyc_verified
                        ? "✅ KYC Verified"
                        : "⏳ KYC Pending"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                  <span>
                    {VEHICLE_EMOJI[rider.vehicle_type]} {rider.vehicle_type} —{" "}
                    {rider.vehicle_plate || "No plate"}
                  </span>
                  <span>📄 {rider.license_number || "No license"}</span>
                  <span>⭐ {rider.rating?.toFixed(1)} rating</span>
                  <span>📦 {rider.total_deliveries} deliveries</span>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant={rider.is_kyc_verified ? "danger" : "primary"}
                    onClick={() => toggleKYC(rider)}
                  >
                    {rider.is_kyc_verified ? "✕ Revoke KYC" : "✅ Verify KYC"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelected(rider)}
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
            <p className="text-4xl mb-3">🛵</p>
            <p className="font-bold text-gray-700">No riders found</p>
          </Card>
        )}
      </div>

      {/* Rider detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Rider Details"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">
                {VEHICLE_EMOJI[selected.vehicle_type]}
              </div>
              <div>
                <p className="font-extrabold text-gray-900">
                  {selected.user?.full_name}
                </p>
                <p className="text-sm text-gray-400">{selected.user?.email}</p>
                <p className="text-sm text-gray-400">{selected.user?.phone}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                [
                  "Vehicle",
                  `${VEHICLE_EMOJI[selected.vehicle_type]} ${selected.vehicle_type}`,
                ],
                ["Plate", selected.vehicle_plate || "—"],
                ["License", selected.license_number || "—"],
                ["GCash", selected.gcash_number || "—"],
                ["Deliveries", selected.total_deliveries],
                ["Rating", `⭐ ${selected.rating?.toFixed(1)}`],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="bg-gray-50 rounded-xl p-3"
                >
                  <p className="text-xs text-gray-400 font-semibold">{label}</p>
                  <p className="font-bold text-gray-900 mt-0.5 capitalize">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <Button
              fullWidth
              loading={saving}
              variant={selected.is_kyc_verified ? "danger" : "primary"}
              leftIcon={
                selected.is_kyc_verified ? (
                  <XCircle size={16} />
                ) : (
                  <CheckCircle size={16} />
                )
              }
              onClick={() => toggleKYC(selected)}
            >
              {selected.is_kyc_verified
                ? "Revoke KYC Verification"
                : "Approve KYC Verification"}
            </Button>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
