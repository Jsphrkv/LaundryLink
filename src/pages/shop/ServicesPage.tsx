import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Clock, Scale, Check, X } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";
import { shopService } from "../../services/shop-rider.service";
import supabase from "../../services/supabase";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import {
  Button,
  Card,
  Toggle,
  PageSpinner,
  Modal,
  Input,
  EmptyState,
} from "../../components/ui";
import { SERVICE_LABELS, SERVICE_META, APP_CONFIG } from "../../constants";
import { ServiceType, ShopProfile, ShopService } from "../../types";
import clsx from "clsx";

const ALL_SERVICES: ServiceType[] = [
  "wash_fold",
  "wash_dry",
  "express",
  "dry_clean",
  "ironing",
];

interface ServiceForm {
  service_type: ServiceType;
  price_per_kg: number;
  minimum_kg: number;
  estimated_hours: number;
  is_available: boolean;
}

const DEFAULT_FORM: ServiceForm = {
  service_type: "wash_fold",
  price_per_kg: 60,
  minimum_kg: 1,
  estimated_hours: 24,
  is_available: true,
};

export default function ShopServicesPage() {
  const { user } = useAuthStore();
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [services, setServices] = useState<ShopService[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ShopService | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ServiceForm>(DEFAULT_FORM);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const s = await shopService.getMyShop(user.id);
    setShop(s);
    if (s) setServices(s.services ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    // Default to a service type not yet added
    const existing = services.map((s) => s.service_type);
    const next = ALL_SERVICES.find((s) => !existing.includes(s)) ?? "wash_fold";
    setForm({ ...DEFAULT_FORM, service_type: next });
    setEditing(null);
    setModal(true);
  };

  const openEdit = (svc: ShopService) => {
    setForm({
      service_type: svc.service_type,
      price_per_kg: svc.price_per_kg,
      minimum_kg: svc.minimum_kg,
      estimated_hours: svc.estimated_hours,
      is_available: svc.is_available,
    });
    setEditing(svc);
    setModal(true);
  };

  const handleSave = async () => {
    if (!shop) return;
    if (form.price_per_kg <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        // Update existing
        const { error } = await supabase
          .from("shop_services")
          .update({
            price_per_kg: form.price_per_kg,
            minimum_kg: form.minimum_kg,
            estimated_hours: form.estimated_hours,
            is_available: form.is_available,
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Service updated!");
      } else {
        // Check not duplicate
        if (services.some((s) => s.service_type === form.service_type)) {
          toast.error(
            "This service type already exists. Edit the existing one instead.",
          );
          return;
        }
        const { error } = await supabase.from("shop_services").insert({
          shop_id: shop.id,
          service_type: form.service_type,
          price_per_kg: form.price_per_kg,
          minimum_kg: form.minimum_kg,
          estimated_hours: form.estimated_hours,
          is_available: form.is_available,
        });
        if (error) throw error;
        toast.success("Service added!");
      }
      setModal(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || "Could not save service");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (svcId: string) => {
    if (!confirm("Remove this service?")) return;
    setDeleting(svcId);
    try {
      const { error } = await supabase
        .from("shop_services")
        .delete()
        .eq("id", svcId);
      if (error) throw error;
      toast.success("Service removed");
      await load();
    } catch {
      toast.error("Could not remove service");
    } finally {
      setDeleting(null);
    }
  };

  const toggleAvailable = async (svc: ShopService) => {
    try {
      await supabase
        .from("shop_services")
        .update({ is_available: !svc.is_available })
        .eq("id", svc.id);
      await load();
    } catch {
      toast.error("Could not update availability");
    }
  };

  const addedTypes = services.map((s) => s.service_type);
  const missingTypes = ALL_SERVICES.filter((t) => !addedTypes.includes(t));

  if (loading)
    return (
      <DashboardLayout title="Services">
        <PageSpinner />
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="My Services">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">
            Service Offerings
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage the services your shop provides and their pricing
          </p>
        </div>
        {missingTypes.length > 0 && (
          <Button onClick={openAdd} leftIcon={<Plus size={16} />}>
            Add Service
          </Button>
        )}
      </div>

      {/* No shop setup */}
      {!shop && (
        <EmptyState
          emoji="🏪"
          title="Shop profile not set up"
          subtitle="Complete your shop profile first before adding services."
        />
      )}

      {/* Services grid */}
      {shop && services.length === 0 && (
        <EmptyState
          emoji="👕"
          title="No services yet"
          subtitle="Add your first service to start accepting orders."
          action="Add First Service"
          onAction={openAdd}
        />
      )}

      {shop && services.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {services.map((svc) => {
            const meta = SERVICE_META[svc.service_type];
            return (
              <Card
                key={svc.id}
                className={clsx(
                  "p-5 transition-all",
                  !svc.is_available && "opacity-60",
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={clsx(
                      "w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0",
                      meta?.color ?? "bg-gray-50",
                    )}
                  >
                    {meta?.icon ?? "🧺"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-gray-900">
                        {SERVICE_LABELS[svc.service_type]}
                      </h3>
                      <Toggle
                        checked={svc.is_available}
                        onChange={() => toggleAvailable(svc)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-base font-extrabold text-primary">
                          {APP_CONFIG.currency}
                          {svc.price_per_kg}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          per kg
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-base font-extrabold text-gray-700">
                          {svc.minimum_kg} kg
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          minimum
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-base font-extrabold text-gray-700">
                          {svc.estimated_hours}h
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">ETA</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <span
                        className={clsx(
                          "text-xs font-bold px-2 py-0.5 rounded-full",
                          svc.is_available
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {svc.is_available ? "✅ Available" : "⏸ Unavailable"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    leftIcon={<Pencil size={14} />}
                    onClick={() => openEdit(svc)}
                  >
                    Edit Pricing
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deleting === svc.id}
                    leftIcon={<Trash2 size={14} />}
                    onClick={() => handleDelete(svc.id)}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Missing services hint */}
      {shop && missingTypes.length > 0 && services.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-100">
          <p className="text-sm font-semibold text-blue-700 mb-2">
            💡 You can still add these services:
          </p>
          <div className="flex flex-wrap gap-2">
            {missingTypes.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setForm({ ...DEFAULT_FORM, service_type: t });
                  setEditing(null);
                  setModal(true);
                }}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-white text-blue-700 border border-blue-200 rounded-full hover:bg-blue-100 transition"
              >
                {SERVICE_META[t]?.icon} {SERVICE_LABELS[t]} <Plus size={10} />
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={
          editing
            ? `Edit ${SERVICE_LABELS[editing.service_type]}`
            : "Add New Service"
        }
      >
        <div className="space-y-1">
          {/* Service type selector (only for new) */}
          {!editing && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-gray-600 mb-2">
                Service Type
              </p>
              <div className="grid grid-cols-1 gap-2">
                {missingTypes.map((t) => {
                  const meta = SERVICE_META[t];
                  return (
                    <button
                      key={t}
                      onClick={() =>
                        setForm((f) => ({ ...f, service_type: t }))
                      }
                      className={clsx(
                        "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                        form.service_type === t
                          ? "border-primary bg-primary-50"
                          : "border-gray-100 hover:border-gray-200",
                      )}
                    >
                      <span className="text-2xl">{meta?.icon}</span>
                      <div>
                        <p
                          className={clsx(
                            "font-bold text-sm",
                            form.service_type === t
                              ? "text-primary"
                              : "text-gray-900",
                          )}
                        >
                          {SERVICE_LABELS[t]}
                        </p>
                        <p className="text-xs text-gray-400">{meta?.eta}</p>
                      </div>
                      {form.service_type === t && (
                        <Check className="ml-auto text-primary" size={16} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Input
            label="Price per kg (₱)"
            type="number"
            min="1"
            value={form.price_per_kg}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                price_per_kg: parseFloat(e.target.value) || 0,
              }))
            }
            leftIcon={
              <span className="text-xs font-bold text-gray-400">₱</span>
            }
            hint="e.g. 60 means ₱60 per kilogram"
          />

          <Input
            label="Minimum weight accepted (kg)"
            type="number"
            min="0.5"
            step="0.5"
            value={form.minimum_kg}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                minimum_kg: parseFloat(e.target.value) || 1,
              }))
            }
            leftIcon={<Scale size={14} />}
          />

          <Input
            label="Estimated completion time (hours)"
            type="number"
            min="1"
            value={form.estimated_hours}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                estimated_hours: parseInt(e.target.value) || 24,
              }))
            }
            leftIcon={<Clock size={14} />}
            hint="e.g. 24 = next day, 6 = same day express"
          />

          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-700">
                Available for booking
              </p>
              <p className="text-xs text-gray-400">
                Customers can book this service
              </p>
            </div>
            <Toggle
              checked={form.is_available}
              onChange={(v) => setForm((f) => ({ ...f, is_available: v }))}
            />
          </div>

          {/* Price preview */}
          <div className="bg-primary-50 rounded-xl p-3 mb-2">
            <p className="text-xs font-semibold text-primary mb-1">
              💡 Price Preview
            </p>
            <p className="text-xs text-primary">
              3 kg order →{" "}
              <span className="font-extrabold">
                {APP_CONFIG.currency}
                {(form.price_per_kg * 3).toFixed(0)}
              </span>{" "}
              subtotal
            </p>
            <p className="text-xs text-primary">
              5 kg order →{" "}
              <span className="font-extrabold">
                {APP_CONFIG.currency}
                {(form.price_per_kg * 5).toFixed(0)}
              </span>{" "}
              subtotal
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setModal(false)}
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
              {editing ? "Save Changes" : "Add Service"}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
