import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Search, Shield, ShieldOff, ChevronDown } from "lucide-react";
import supabase from "../../services/supabase";
import { User, UserRole } from "../../types";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Card, PageSpinner, Input, Button, Modal } from "../../components/ui";
import clsx from "clsx";

const ROLE_BADGE: Record<UserRole, string> = {
  customer: "bg-blue-100 text-blue-700",
  rider: "bg-green-100 text-green-700",
  shop_owner: "bg-purple-100 text-purple-700",
  admin: "bg-gray-800 text-white",
};

const ROLE_EMOJI: Record<UserRole, string> = {
  customer: "👤",
  rider: "🛵",
  shop_owner: "🏪",
  admin: "🔑",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selected, setSelected] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = {
    all: users.length,
    customer: users.filter((u) => u.role === "customer").length,
    rider: users.filter((u) => u.role === "rider").length,
    shop_owner: users.filter((u) => u.role === "shop_owner").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  const toggleVerified = async (user: User) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ is_verified: !user.is_verified })
        .eq("id", user.id);
      if (error) throw error;
      toast.success(`User ${user.is_verified ? "unverified" : "verified"}`);
      setSelected(null);
      await load();
    } catch {
      toast.error("Could not update user");
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (user: User, role: UserRole) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ role })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Role updated");
      setSelected(null);
      await load();
    } catch {
      toast.error("Could not update role");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <DashboardLayout title="Users">
        <PageSpinner />
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="Manage Users">
      {/* Stats row */}
      <div className="flex gap-2 flex-wrap mb-5">
        {(["all", "customer", "rider", "shop_owner", "admin"] as const).map(
          (r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-all",
                roleFilter === r
                  ? "border-primary bg-primary text-white"
                  : "border-gray-200 text-gray-600 hover:border-primary-300",
              )}
            >
              {r === "all"
                ? `All (${counts.all})`
                : `${ROLE_EMOJI[r as UserRole]} ${r.replace("_", " ")} (${counts[r]})`}
            </button>
          ),
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search size={15} />}
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["User", "Role", "Phone", "Status", "Joined", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {user.full_name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {user.full_name}
                        </p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "text-xs font-bold px-2 py-0.5 rounded-full capitalize",
                        ROLE_BADGE[user.role],
                      )}
                    >
                      {ROLE_EMOJI[user.role]} {user.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {user.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        user.is_verified
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {user.is_verified ? "✅ Verified" : "⏳ Unverified"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(user.created_at).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(user)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Manage User"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center text-2xl font-extrabold text-primary">
                {selected.full_name[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-extrabold text-gray-900">
                  {selected.full_name}
                </p>
                <p className="text-sm text-gray-400">{selected.email}</p>
                <p className="text-sm text-gray-400">{selected.phone}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">
                Verification Status
              </p>
              <button
                onClick={() => toggleVerified(selected)}
                className={clsx(
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm border-2 transition-all",
                  selected.is_verified
                    ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                    : "border-green-200 text-green-700 hover:bg-green-50",
                )}
              >
                {selected.is_verified ? (
                  <>
                    <ShieldOff size={16} /> Revoke Verification
                  </>
                ) : (
                  <>
                    <Shield size={16} /> Verify This User
                  </>
                )}
              </button>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">
                Change Role
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  ["customer", "rider", "shop_owner", "admin"] as UserRole[]
                ).map((r) => (
                  <button
                    key={r}
                    onClick={() => changeRole(selected, r)}
                    disabled={selected.role === r || saving}
                    className={clsx(
                      "py-2 rounded-xl text-xs font-bold border-2 transition-all capitalize",
                      selected.role === r
                        ? "border-primary bg-primary text-white"
                        : "border-gray-200 text-gray-600 hover:border-primary-300 disabled:opacity-50",
                    )}
                  >
                    {ROLE_EMOJI[r]} {r.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
              User ID:{" "}
              <span className="font-mono">{selected.id.slice(0, 16)}…</span>
              <br />
              Joined:{" "}
              {new Date(selected.created_at).toLocaleDateString("en-PH", {
                dateStyle: "long",
              })}
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
