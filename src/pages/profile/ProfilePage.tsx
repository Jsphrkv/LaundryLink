import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  Home,
  Briefcase,
  Check,
  X,
  Lock,
  Eye,
  EyeOff,
  Store,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { addressService } from "../../services/address.service";
import { shopService } from "../../services/shop-rider.service";
import supabase from "../../services/supabase";
import { Address, ShopProfile } from "../../types";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import {
  Button,
  Card,
  Input,
  Textarea,
  PageSpinner,
  Modal,
  EmptyState,
} from "../../components/ui";
import { APP_CONFIG } from "../../constants";
import clsx from "clsx";

export default function ProfilePage() {
  const { user, updateProfile, signOut } = useAuthStore();
  const isShop = user?.role === "shop_owner";
  const isRider = user?.role === "rider";
  const isCustomer = user?.role === "customer";

  return (
    <DashboardLayout title="Profile">
      <div className="max-w-2xl mx-auto space-y-5">
        <PersonalInfoCard />
        {(isCustomer || isRider) && <AddressBook />}
        {isShop && <ShopInfoCard />}
        {isRider && <RiderVehicleCard />}
        <ChangePasswordCard />
        <DangerZone />
      </div>
    </DashboardLayout>
  );
}

// ─── Personal Info ────────────────────────────────────────────────────────────
function PersonalInfoCard() {
  const { user, updateProfile } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ full_name: name.trim(), phone: phone.trim() });
      setEditing(false);
      toast.success("Profile updated!");
    } catch {
      toast.error("Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold text-gray-900">
          Personal Information
        </h2>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Pencil size={14} />}
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
        )}
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center text-2xl font-extrabold text-primary shrink-0">
          {user?.full_name?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-extrabold text-gray-900 text-lg">
            {user?.full_name}
          </p>
          <span className="inline-block mt-1 px-3 py-0.5 bg-primary-50 text-primary text-xs font-bold rounded-full capitalize">
            {user?.role?.replace("_", " ")}
          </span>
        </div>
      </div>

      {editing ? (
        <div>
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<User size={15} />}
          />
          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone size={15} />}
            hint="e.g. +63 912 345 6789"
          />
          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-gray-400 font-semibold">
              Email (cannot be changed)
            </p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">
              {user?.email}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setEditing(false)}
              leftIcon={<X size={14} />}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              loading={saving}
              onClick={handleSave}
              leftIcon={<Check size={14} />}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <InfoRow
            icon={<User size={15} />}
            label="Full Name"
            value={user?.full_name}
          />
          <InfoRow
            icon={<Mail size={15} />}
            label="Email"
            value={user?.email}
          />
          <InfoRow
            icon={<Phone size={15} />}
            label="Phone"
            value={user?.phone || "—"}
          />
        </div>
      )}
    </Card>
  );
}

// ─── Address Book ─────────────────────────────────────────────────────────────
function AddressBook() {
  const { user } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editAddr, setEditAddr] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<
    { place_name: string; lat: number; lng: number }[]
  >([]);

  const [form, setForm] = useState({
    label: "Home",
    full_address: "",
    barangay: "",
    city: APP_CONFIG.defaultCity,
    province: "Metro Manila",
    is_default: false,
    lat: APP_CONFIG.defaultLat,
    lng: APP_CONFIG.defaultLng,
  });

  const load = useCallback(async () => {
    if (!user) return;
    const a = await addressService.getUserAddresses(user.id);
    setAddresses(a);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditAddr(null);
    setForm({
      label: "Home",
      full_address: "",
      barangay: "",
      city: APP_CONFIG.defaultCity,
      province: "Metro Manila",
      is_default: addresses.length === 0,
      lat: APP_CONFIG.defaultLat,
      lng: APP_CONFIG.defaultLng,
    });
    setModal(true);
  };

  const openEdit = (addr: Address) => {
    setEditAddr(addr);
    setForm({
      label: addr.label,
      full_address: addr.full_address,
      barangay: addr.barangay,
      city: addr.city,
      province: addr.province,
      is_default: addr.is_default,
      lat: addr.lat,
      lng: addr.lng,
    });
    setModal(true);
  };

  const handleAddressInput = async (val: string) => {
    setForm((f) => ({ ...f, full_address: val }));
    if (val.length >= 3) {
      const s = await addressService.searchAddresses(val);
      setSuggestions(s);
    } else {
      setSuggestions([]);
    }
  };

  const pickSuggestion = (s: {
    place_name: string;
    lat: number;
    lng: number;
  }) => {
    setForm((f) => ({
      ...f,
      full_address: s.place_name,
      lat: s.lat,
      lng: s.lng,
    }));
    setSuggestions([]);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.full_address.trim()) {
      toast.error("Enter a full address");
      return;
    }
    setSaving(true);
    try {
      // Try geocoding if coords are still default
      if (form.lat === APP_CONFIG.defaultLat) {
        const geo = await addressService.geocodeAddress(form.full_address);
        if (geo) {
          form.lat = geo.lat;
          form.lng = geo.lng;
        }
      }

      if (editAddr) {
        await addressService.updateAddress(editAddr.id, form);
        toast.success("Address updated!");
      } else {
        await addressService.addAddress(user.id, form);
        toast.success("Address saved!");
      }
      setModal(false);
      await load();
    } catch {
      toast.error("Could not save address");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    setDeleting(id);
    try {
      await addressService.deleteAddress(id);
      toast.success("Address removed");
      await load();
    } catch {
      toast.error("Could not delete address");
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    try {
      await addressService.setDefault(user.id, id);
      await load();
      toast.success("Default address updated!");
    } catch {
      toast.error("Could not update default");
    }
  };

  const LABEL_OPTIONS = ["Home", "Office", "School", "Other"];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold text-gray-900">
          {user?.role === "rider" ? "My Address" : "Saved Addresses"}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={openAdd}
        >
          Add Address
        </Button>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : addresses.length === 0 ? (
        <EmptyState
          emoji="📍"
          title="No addresses saved"
          subtitle="Add your pickup address to start booking."
          action="Add Address"
          onAction={openAdd}
        />
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={clsx(
                "flex items-start gap-3 p-4 rounded-xl border-2 transition-all",
                addr.is_default
                  ? "border-primary bg-primary-50"
                  : "border-gray-100",
              )}
            >
              <div
                className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg",
                  addr.is_default ? "bg-primary text-white" : "bg-gray-100",
                )}
              >
                {addr.label.toLowerCase() === "home"
                  ? "🏠"
                  : addr.label.toLowerCase() === "office"
                    ? "🏢"
                    : addr.label.toLowerCase() === "school"
                      ? "🏫"
                      : "📍"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-900 text-sm">
                    {addr.label}
                  </p>
                  {addr.is_default && (
                    <span className="text-xs font-bold px-2 py-0.5 bg-primary text-white rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">
                  {addr.full_address}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {addr.city}, {addr.province}
                </p>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {!addr.is_default && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Set as Default
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(addr)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-danger hover:opacity-80"
                  >
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modal}
        onClose={() => {
          setModal(false);
          setSuggestions([]);
        }}
        title={editAddr ? "Edit Address" : "Add New Address"}
      >
        <div className="space-y-1">
          {/* Label selector */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-600 mb-2">Label</p>
            <div className="flex gap-2 flex-wrap">
              {LABEL_OPTIONS.map((l) => (
                <button
                  key={l}
                  onClick={() => setForm((f) => ({ ...f, label: l }))}
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-all",
                    form.label === l
                      ? "border-primary bg-primary-50 text-primary"
                      : "border-gray-200 text-gray-600 hover:border-gray-300",
                  )}
                >
                  {l === "Home"
                    ? "🏠"
                    : l === "Office"
                      ? "🏢"
                      : l === "School"
                        ? "🏫"
                        : "📍"}{" "}
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Address input with autocomplete */}
          <div className="relative mb-4">
            <Input
              label="Full Address"
              value={form.full_address}
              onChange={(e) => handleAddressInput(e.target.value)}
              placeholder="Start typing your address..."
              leftIcon={<MapPin size={15} />}
            />
            {suggestions.length > 0 && (
              <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-elevated -mt-3 overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-start gap-2"
                  >
                    <MapPin
                      size={12}
                      className="text-gray-400 mt-0.5 shrink-0"
                    />
                    <span>{s.place_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Input
            label="Barangay"
            value={form.barangay}
            onChange={(e) =>
              setForm((f) => ({ ...f, barangay: e.target.value }))
            }
            placeholder="e.g. Barangay San Dionisio"
          />
          <Input
            label="City / Municipality"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
          <Input
            label="Province"
            value={form.province}
            onChange={(e) =>
              setForm((f) => ({ ...f, province: e.target.value }))
            }
          />

          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl mb-2">
            <p className="text-sm font-semibold text-gray-700">
              Set as default address
            </p>
            <button
              onClick={() =>
                setForm((f) => ({ ...f, is_default: !f.is_default }))
              }
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative",
                form.is_default ? "bg-primary" : "bg-gray-300",
              )}
            >
              <span
                className={clsx(
                  "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform",
                  form.is_default && "translate-x-6",
                )}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setModal(false);
                setSuggestions([]);
              }}
              leftIcon={<X size={14} />}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              loading={saving}
              onClick={handleSave}
              leftIcon={<Check size={14} />}
            >
              {editAddr ? "Save Changes" : "Add Address"}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

// ─── Shop Info Card ───────────────────────────────────────────────────────────
function ShopInfoCard() {
  const { user } = useAuthStore();
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [suggestions, setSuggestions] = useState<
    { place_name: string; lat: number; lng: number }[]
  >([]);
  const [form, setForm] = useState({
    shop_name: "",
    description: "",
    address: "",
    phone: "",
    lat: APP_CONFIG.defaultLat,
    lng: APP_CONFIG.defaultLng,
  });

  useEffect(() => {
    if (!user) return;
    shopService.getMyShop(user.id).then((s) => {
      setShop(s);
      if (s)
        setForm({
          shop_name: s.shop_name,
          description: s.description ?? "",
          address: s.address,
          phone: s.phone,
          lat: s.lat,
          lng: s.lng,
        });
    });
  }, [user]);

  const handleAddressInput = async (val: string) => {
    setForm((f) => ({ ...f, address: val }));
    if (val.length >= 3) {
      const s = await addressService.searchAddresses(val);
      setSuggestions(s);
    } else setSuggestions([]);
  };

  // Upload logo to Supabase Storage
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shop) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${shop.id}/logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("shop-logos")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("shop-logos").getPublicUrl(path);
      await shopService.updateShop(shop.id, { logo_url: data.publicUrl });
      setShop((prev) => (prev ? { ...prev, logo_url: data.publicUrl } : prev));
      toast.success("Logo uploaded!");
    } catch {
      toast.error("Could not upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!shop) return;
    setSaving(true);
    try {
      if (form.lat === APP_CONFIG.defaultLat) {
        const geo = await addressService.geocodeAddress(form.address);
        if (geo) {
          form.lat = geo.lat;
          form.lng = geo.lng;
        }
      }
      await shopService.updateShop(shop.id, form);
      setEditing(false);
      setSuggestions([]);
      toast.success("Shop profile updated!");
      const updated = await shopService.getMyShop(user!.id);
      setShop(updated);
    } catch {
      toast.error("Could not save shop info");
    } finally {
      setSaving(false);
    }
  };

  if (!shop) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold text-gray-900">
          Shop Information
        </h2>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Pencil size={14} />}
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
        )}
      </div>

      {/* Logo upload */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
          {shop.logo_url ? (
            <img
              src={shop.logo_url}
              alt="Shop logo"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-3xl">🏪</span>
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-700 mb-1">Shop Logo</p>
          <p className="text-xs text-gray-400 mb-2">PNG or JPG, max 2MB</p>
          <label
            className={clsx(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all",
              uploading
                ? "bg-gray-100 text-gray-400"
                : "bg-primary-50 text-primary hover:bg-primary-100",
            )}
          >
            {uploading ? "⏳ Uploading..." : "📸 Upload Logo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {editing ? (
        <div>
          <Input
            label="Shop Name"
            value={form.shop_name}
            onChange={(e) =>
              setForm((f) => ({ ...f, shop_name: e.target.value }))
            }
            leftIcon={<Store size={15} />}
          />
          <div className="relative mb-4">
            <Input
              label="Shop Address"
              value={form.address}
              onChange={(e) => handleAddressInput(e.target.value)}
              placeholder="Enter your shop's address..."
              leftIcon={<MapPin size={15} />}
            />
            {suggestions.length > 0 && (
              <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl shadow-elevated -mt-3 overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        address: s.place_name,
                        lat: s.lat,
                        lng: s.lng,
                      }));
                      setSuggestions([]);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-start gap-2"
                  >
                    <MapPin
                      size={12}
                      className="text-gray-400 mt-0.5 shrink-0"
                    />
                    <span>{s.place_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input
            label="Contact Phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            leftIcon={<Phone size={15} />}
          />
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-600 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Tell customers about your shop..."
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:bg-white resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setEditing(false);
                setSuggestions([]);
              }}
              leftIcon={<X size={14} />}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              loading={saving}
              onClick={handleSave}
              leftIcon={<Check size={14} />}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <InfoRow
            icon={<Store size={15} />}
            label="Shop Name"
            value={shop.shop_name || "—"}
          />
          <InfoRow
            icon={<MapPin size={15} />}
            label="Address"
            value={shop.address || "—"}
          />
          <InfoRow
            icon={<Phone size={15} />}
            label="Phone"
            value={shop.phone || "—"}
          />
          {shop.description && (
            <InfoRow
              icon={<User size={15} />}
              label="Description"
              value={shop.description}
            />
          )}
          <InfoRow
            icon={<Star size={15} />}
            label="Rating"
            value={`⭐ ${shop.rating.toFixed(1)} (${shop.total_reviews} reviews)`}
          />
          <div className="flex items-center gap-3 py-2">
            <span className="text-gray-400">
              <MapPin size={15} />
            </span>
            <div>
              <p className="text-xs text-gray-400">Verification Status</p>
              <span
                className={clsx(
                  "text-xs font-bold px-2 py-0.5 rounded-full",
                  shop.is_verified
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700",
                )}
              >
                {shop.is_verified ? "✅ Verified" : "⏳ Pending Verification"}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Rider Vehicle Card ───────────────────────────────────────────────────────
function RiderVehicleCard() {
  const { user } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({
    vehicle_type: "motorcycle",
    vehicle_plate: "",
    license_number: "",
    gcash_number: "",
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("rider_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setForm({
            vehicle_type: data.vehicle_type ?? "motorcycle",
            vehicle_plate: data.vehicle_plate ?? "",
            license_number: data.license_number ?? "",
            gcash_number: data.gcash_number ?? "",
          });
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("rider_profiles")
        .update(form)
        .eq("id", profile.id);
      if (error) throw error;
      setEditing(false);
      toast.success("Vehicle info updated!");
    } catch {
      toast.error("Could not save vehicle info");
    } finally {
      setSaving(false);
    }
  };

  const VEHICLE_TYPES = [
    { value: "motorcycle", label: "Motorcycle", icon: "🛵" },
    { value: "bicycle", label: "Bicycle", icon: "🚲" },
    { value: "tricycle", label: "Tricycle", icon: "🛺" },
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold text-gray-900">
          Vehicle & KYC
        </h2>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Pencil size={14} />}
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div>
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-600 mb-2">
              Vehicle Type
            </p>
            <div className="grid grid-cols-3 gap-2">
              {VEHICLE_TYPES.map((v) => (
                <button
                  key={v.value}
                  onClick={() =>
                    setForm((f) => ({ ...f, vehicle_type: v.value }))
                  }
                  className={clsx(
                    "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                    form.vehicle_type === v.value
                      ? "border-primary bg-primary-50"
                      : "border-gray-100 hover:border-gray-200",
                  )}
                >
                  <span className="text-2xl">{v.icon}</span>
                  <span
                    className={clsx(
                      "text-xs font-bold",
                      form.vehicle_type === v.value
                        ? "text-primary"
                        : "text-gray-600",
                    )}
                  >
                    {v.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Plate Number"
            value={form.vehicle_plate}
            onChange={(e) =>
              setForm((f) => ({ ...f, vehicle_plate: e.target.value }))
            }
            placeholder="ABC 1234"
          />
          <Input
            label="Driver's License Number"
            value={form.license_number}
            onChange={(e) =>
              setForm((f) => ({ ...f, license_number: e.target.value }))
            }
            placeholder="N01-23-456789"
          />
          <Input
            label="GCash Number (for payouts)"
            value={form.gcash_number}
            onChange={(e) =>
              setForm((f) => ({ ...f, gcash_number: e.target.value }))
            }
            placeholder="+63 912 345 6789"
            leftIcon={<Phone size={15} />}
          />
          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setEditing(false)}
              leftIcon={<X size={14} />}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              loading={saving}
              onClick={handleSave}
              leftIcon={<Check size={14} />}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <InfoRow
            icon={<span className="text-base">🛵</span>}
            label="Vehicle Type"
            value={
              VEHICLE_TYPES.find((v) => v.value === form.vehicle_type)?.label ??
              "—"
            }
          />
          <InfoRow
            icon={<span className="text-base">🪪</span>}
            label="Plate Number"
            value={form.vehicle_plate || "—"}
          />
          <InfoRow
            icon={<span className="text-base">📄</span>}
            label="License"
            value={form.license_number || "—"}
          />
          <InfoRow
            icon={<Phone size={15} />}
            label="GCash"
            value={form.gcash_number || "—"}
          />
          <div className="flex items-center gap-3 py-2">
            <span className="text-gray-400">🔐</span>
            <div>
              <p className="text-xs text-gray-400">KYC Verification</p>
              <span
                className={clsx(
                  "text-xs font-bold px-2 py-0.5 rounded-full",
                  profile?.is_kyc_verified
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700",
                )}
              >
                {profile?.is_kyc_verified ? "✅ Verified" : "⏳ Pending"}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Change Password ──────────────────────────────────────────────────────────
function ChangePasswordCard() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (!newPw || !confirm) {
      toast.error("Fill in all fields");
      return;
    }
    if (newPw !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setOpen(false);
      setCurrent("");
      setNewPw("");
      setConfirm("");
      toast.success("Password updated!");
    } catch (err: any) {
      toast.error(err.message || "Could not update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-gray-900">Password</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Update your account password
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Lock size={14} />}
          onClick={() => setOpen(!open)}
        >
          {open ? "Cancel" : "Change"}
        </Button>
      </div>

      {open && (
        <div className="mt-4 space-y-1">
          <Input
            label="New Password"
            type={show ? "text" : "password"}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="At least 8 characters"
            leftIcon={<Lock size={15} />}
            rightElement={
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="text-gray-400"
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />
          <Input
            label="Confirm New Password"
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat new password"
            leftIcon={<Lock size={15} />}
          />
          <Button
            fullWidth
            loading={saving}
            onClick={handleChange}
            leftIcon={<Check size={14} />}
          >
            Update Password
          </Button>
        </div>
      )}
    </Card>
  );
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────
function DangerZone() {
  const { signOut } = useAuthStore();
  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };
  return (
    <Card className="p-5 border-red-100">
      <h2 className="text-base font-extrabold text-gray-900 mb-3">Account</h2>
      <button
        onClick={handleSignOut}
        className="w-full py-3 rounded-xl border-2 border-red-200 text-red-600 font-bold hover:bg-red-50 transition-all text-sm flex items-center justify-center gap-2"
      >
        Sign Out
      </button>
    </Card>
  );
}

// ─── Shared helper ────────────────────────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-semibold">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5 break-words">
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}
