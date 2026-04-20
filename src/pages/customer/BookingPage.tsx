import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDays, format } from "date-fns";
import toast from "react-hot-toast";
import {
  MapPin,
  Calendar,
  Scale,
  Shirt,
  Store,
  CreditCard,
  CheckCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useBookingStore } from "../../store/booking.store";
import { useAuthStore } from "../../store/auth.store";
import { addressService } from "../../services/address.service";
import { shopService } from "../../services/shop-rider.service";
import { orderService } from "../../services/order.service";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { ShopCard } from "../../components/common/Cards";
import { Button, Input, Textarea, Card, EmptyState } from "../../components/ui";
import { Address, ServiceType, ShopFilter, ShopProfile } from "../../types";
import {
  SERVICE_META,
  SERVICE_LABELS,
  TIME_SLOTS,
  APP_CONFIG,
} from "../../constants";
import clsx from "clsx";

const STEPS = [
  { label: "Address", icon: MapPin },
  { label: "Schedule", icon: Calendar },
  { label: "Laundry", icon: Scale },
  { label: "Service", icon: Shirt },
  { label: "Shop", icon: Store },
  { label: "Payment", icon: CreditCard },
  { label: "Confirm", icon: CheckCircle },
];

export default function BookingPage() {
  const navigate = useNavigate();
  const booking = useBookingStore();

  useEffect(() => {
    booking.reset();
  }, []);

  return (
    <DashboardLayout title="Book a Pickup">
      <div className="max-w-2xl mx-auto">
        {/* Step progress */}
        <div className="flex items-center mb-8 overflow-x-auto pb-2 scrollbar-thin gap-1">
          {STEPS.map((s, i) => {
            const done = i < booking.step;
            const current = i === booking.step;
            return (
              <React.Fragment key={i}>
                <div
                  className={clsx(
                    "flex flex-col items-center gap-1 shrink-0",
                    current
                      ? "opacity-100"
                      : done
                        ? "opacity-100"
                        : "opacity-40",
                  )}
                >
                  <div
                    className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                      done
                        ? "bg-success text-white"
                        : current
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-400",
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <span
                    className={clsx(
                      "text-[10px] font-semibold whitespace-nowrap",
                      current
                        ? "text-primary"
                        : done
                          ? "text-success"
                          : "text-gray-400",
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={clsx(
                      "h-0.5 flex-1 mx-1 mt-[-12px] rounded transition-all",
                      done ? "bg-success" : "bg-gray-200",
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content */}
        <div className="page-enter">
          {booking.step === 0 && <StepAddress />}
          {booking.step === 1 && <StepSchedule />}
          {booking.step === 2 && <StepLaundry />}
          {booking.step === 3 && <StepService />}
          {booking.step === 4 && <StepShop />}
          {booking.step === 5 && <StepPayment />}
          {booking.step === 6 && <StepConfirm />}
        </div>
      </div>
    </DashboardLayout>
  );
}

// ─── Step 0: Address ──────────────────────────────────────────────────────────
function StepAddress() {
  const { user } = useAuthStore();
  const booking = useBookingStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [fullAddr, setFullAddr] = useState("");
  const [suggestions, setSuggestions] = useState<
    { place_name: string; lat: number; lng: number }[]
  >([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    addressService
      .getUserAddresses(user.id)
      .then((a) => {
        setAddresses(a);
        const def = a.find((x) => x.is_default);
        if (def) booking.setPickupAddress(def);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleAddressInput = async (val: string) => {
    setFullAddr(val);
    if (val.length >= 3) {
      const s = await addressService.searchAddresses(val);
      setSuggestions(s);
    } else {
      setSuggestions([]);
    }
  };

  const handleSave = async () => {
    if (!fullAddr || !user) {
      toast.error("Enter a full address");
      return;
    }
    setAdding(true);
    try {
      let coords = { lat: 14.5086, lng: 121.0194 };
      const geo = await addressService.geocodeAddress(fullAddr);
      if (geo) coords = geo;

      const addr = await addressService.addAddress(user.id, {
        label: label || "Home",
        full_address: fullAddr,
        barangay: "",
        city: APP_CONFIG.defaultCity,
        province: "Metro Manila",
        ...coords,
        is_default: addresses.length === 0,
      });
      setAddresses((p) => [...p, addr]);
      booking.setPickupAddress(addr);
      setFullAddr("");
      setLabel("");
      setSuggestions([]);
      toast.success("Address saved!");
    } finally {
      setAdding(false);
    }
  };

  return (
    <StepCard
      title="📍 Pickup Address"
      desc="Where should we pick up your laundry?"
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-primary w-8 h-8" />
        </div>
      ) : (
        <>
          {addresses.map((addr) => (
            <div
              key={addr.id}
              onClick={() => booking.setPickupAddress(addr)}
              className={clsx(
                "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all mb-2",
                booking.pickup_address?.id === addr.id
                  ? "border-primary bg-primary-50"
                  : "border-gray-100 hover:border-gray-200",
              )}
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0">
                {addr.label.toLowerCase() === "home"
                  ? "🏠"
                  : addr.label.toLowerCase() === "office"
                    ? "🏢"
                    : "📍"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-gray-900">{addr.label}</p>
                <p className="text-xs text-gray-400 truncate">
                  {addr.full_address}
                </p>
                <p className="text-xs text-gray-400">{addr.city}</p>
              </div>
              {booking.pickup_address?.id === addr.id && (
                <CheckCircle className="text-primary shrink-0" size={20} />
              )}
            </div>
          ))}

          <div className="mt-4 p-4 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-sm font-bold text-gray-700 mb-3">
              + Add New Address
            </p>
            <Input
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Home, Office, etc."
            />

            <div className="relative">
              <Input
                label="Full Address"
                value={fullAddr}
                onChange={(e) => handleAddressInput(e.target.value)}
                placeholder="Start typing your address in the Philippines..."
                leftIcon={<MapPin size={15} />}
              />
              {suggestions.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-elevated -mt-3 mb-2 overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setFullAddr(s.place_name);
                        setSuggestions([]);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      📍 {s.place_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              onClick={handleSave}
              loading={adding}
              fullWidth
            >
              Save Address
            </Button>
          </div>
        </>
      )}

      <StepNav
        onNext={() => {
          if (!booking.pickup_address) {
            toast.error("Please select a pickup address");
            return;
          }
          booking.nextStep();
        }}
        hideBack
      />
    </StepCard>
  );
}

// ─── Step 1: Schedule ─────────────────────────────────────────────────────────
function StepSchedule() {
  const booking = useBookingStore();
  const today = new Date();
  // Include today + next 6 days = 7 total options
  const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const [selDate, setSelDate] = useState("");
  const [selTime, setSelTime] = useState("");

  return (
    <StepCard
      title="📅 Schedule Pickup"
      desc="When should we pick up your laundry?"
    >
      <div className="mb-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Select Date
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {dates.map((d, i) => {
            const str = format(d, "yyyy-MM-dd");
            const active = selDate === str;
            const isToday = i === 0;
            return (
              <button
                key={str}
                onClick={() => setSelDate(str)}
                className={clsx(
                  "flex flex-col items-center px-4 py-3 rounded-xl border-2 transition-all shrink-0 min-w-[64px]",
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 hover:border-primary-300",
                )}
              >
                <span
                  className={clsx(
                    "text-xs font-bold",
                    active
                      ? "text-white"
                      : isToday
                        ? "text-primary"
                        : "text-gray-400",
                  )}
                >
                  {isToday ? "Today" : format(d, "EEE")}
                </span>
                <span
                  className={clsx(
                    "text-xl font-extrabold",
                    active ? "text-white" : "text-gray-900",
                  )}
                >
                  {format(d, "d")}
                </span>
                <span
                  className={clsx(
                    "text-xs",
                    active ? "text-white/80" : "text-gray-400",
                  )}
                >
                  {format(d, "MMM")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Select Time Slot
        </p>
        <div className="space-y-2">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              onClick={() => setSelTime(slot)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                selTime === slot
                  ? "border-primary bg-primary-50 text-primary"
                  : "border-gray-200 text-gray-700 hover:border-primary-300",
              )}
            >
              🕐 {slot}
            </button>
          ))}
        </div>
      </div>

      <StepNav
        onNext={() => {
          if (!selDate || !selTime) {
            toast.error("Please select a date and time");
            return;
          }
          booking.setSchedule(selDate, selTime);
          booking.nextStep();
        }}
        onBack={booking.prevStep}
      />
    </StepCard>
  );
}

// ─── Step 2: Laundry Details ──────────────────────────────────────────────────
function StepLaundry() {
  const booking = useBookingStore();
  const [bags, setBags] = useState(booking.bag_count);
  const [weight, setWeight] = useState(booking.estimated_weight_kg);
  const [notes, setNotes] = useState(booking.special_instructions ?? "");

  const counter = (
    val: number,
    set: (v: number) => void,
    step = 1,
    min = 1,
    max = 20,
  ) => (
    <div className="flex items-center gap-3">
      <button
        onClick={() => set(Math.max(min, val - step))}
        className="w-9 h-9 rounded-full bg-primary-50 text-primary font-bold text-lg flex items-center justify-center hover:bg-primary-100 transition"
      >
        −
      </button>
      <span className="text-xl font-extrabold text-gray-900 min-w-[60px] text-center">
        {val}
        {step < 1 ? " kg" : ""}
      </span>
      <button
        onClick={() => set(Math.min(max, val + step))}
        className="w-9 h-9 rounded-full bg-primary-50 text-primary font-bold text-lg flex items-center justify-center hover:bg-primary-100 transition"
      >
        +
      </button>
    </div>
  );

  return (
    <StepCard title="⚖️ Laundry Details" desc="Tell us about your laundry load">
      <Card className="p-4 flex items-center justify-between mb-3">
        <div>
          <p className="font-bold text-gray-900">Number of Bags</p>
          <p className="text-xs text-gray-400">Count your laundry bags</p>
        </div>
        {counter(bags, setBags)}
      </Card>

      <Card className="p-4 flex items-center justify-between mb-4">
        <div>
          <p className="font-bold text-gray-900">Estimated Weight</p>
          <p className="text-xs text-gray-400">Rough estimate is fine</p>
        </div>
        {counter(weight, setWeight, 0.5, 1, 50)}
      </Card>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-xs text-blue-700 space-y-1">
        <p className="font-bold">💡 Weight Guide</p>
        <p>1–3 kg → Light load (T-shirts, underwear)</p>
        <p>4–6 kg → Regular load (jeans, polos)</p>
        <p>7+ kg → Heavy load (bedsheets, towels)</p>
      </div>

      <Textarea
        label="Special Instructions (Optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. Separate whites from colors, handle with care..."
        rows={3}
      />

      <StepNav
        onNext={() => {
          booking.setLaundryDetails(bags, weight, notes);
          booking.nextStep();
        }}
        onBack={booking.prevStep}
      />
    </StepCard>
  );
}

// ─── Step 3: Service Type ─────────────────────────────────────────────────────
function StepService() {
  const booking = useBookingStore();
  const [sel, setSel] = useState<ServiceType | undefined>(booking.service_type);

  return (
    <StepCard title="👕 Service Type" desc="What type of service do you need?">
      <div className="space-y-3">
        {(
          Object.entries(SERVICE_META) as [
            ServiceType,
            (typeof SERVICE_META)[keyof typeof SERVICE_META],
          ][]
        ).map(([type, meta]) => (
          <div
            key={type}
            onClick={() => setSel(type)}
            className={clsx(
              "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
              sel === type
                ? "border-primary bg-primary-50"
                : `border-gray-100 ${meta.color} hover:border-primary-200`,
            )}
          >
            <span className="text-3xl">{meta.icon}</span>
            <div className="flex-1">
              <p
                className={clsx(
                  "font-bold",
                  sel === type ? "text-primary" : "text-gray-900",
                )}
              >
                {SERVICE_LABELS[type]}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 bg-white/70 px-2 py-0.5 rounded-full">
                  ⏱ {meta.eta}
                </span>
                <span className="text-xs text-gray-500 bg-white/70 px-2 py-0.5 rounded-full">
                  {meta.hint}
                </span>
              </div>
            </div>
            {sel === type && (
              <CheckCircle className="text-primary shrink-0" size={20} />
            )}
          </div>
        ))}
      </div>

      <StepNav
        onNext={() => {
          if (!sel) {
            toast.error("Please select a service type");
            return;
          }
          booking.setServiceType(sel);
          booking.nextStep();
        }}
        onBack={booking.prevStep}
      />
    </StepCard>
  );
}

// ─── Step 4: Shop Selection ───────────────────────────────────────────────────
function StepShop() {
  const booking = useBookingStore();
  const [shops, setShops] = useState<ShopProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ShopFilter>(booking.shop_filter);

  const load = async (f: ShopFilter) => {
    setLoading(true);
    try {
      const result = await shopService.getNearbyShops(
        APP_CONFIG.defaultLat,
        APP_CONFIG.defaultLng,
        f,
        booking.service_type,
      );
      setShops(result);
    } catch {
      setShops([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
  }, [filter]);

  const FILTERS: { key: ShopFilter; label: string; emoji: string }[] = [
    { key: "nearest", label: "Nearest", emoji: "📍" },
    { key: "cheapest", label: "Cheapest", emoji: "💰" },
    { key: "fastest", label: "Fastest", emoji: "⚡" },
  ];

  return (
    <StepCard title="🏪 Choose a Shop" desc="Select a nearby laundry shop">
      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              booking.setShopFilter(f.key);
            }}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold border-2 transition-all",
              filter === f.key
                ? "border-primary bg-primary text-white"
                : "border-gray-200 text-gray-600 hover:border-primary-300",
            )}
          >
            {f.emoji} {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-3">
          <Loader2 className="animate-spin text-primary w-6 h-6" />
          <span className="text-sm text-gray-500">Finding shops near you…</span>
        </div>
      ) : shops.length === 0 ? (
        <EmptyState
          emoji="🏪"
          title="No shops available"
          subtitle="Try changing the filter or check back later"
        />
      ) : (
        <div className="space-y-3">
          {shops.map((shop) => (
            <ShopCard
              key={shop.id}
              shop={shop}
              selected={booking.selected_shop?.id === shop.id}
              onClick={() => booking.setSelectedShop(shop)}
            />
          ))}
        </div>
      )}

      <StepNav
        onNext={() => {
          if (!booking.selected_shop) {
            toast.error("Please select a shop");
            return;
          }
          booking.nextStep();
        }}
        onBack={booking.prevStep}
      />
    </StepCard>
  );
}

// ─── Step 5: Payment ──────────────────────────────────────────────────────────
function StepPayment() {
  const booking = useBookingStore();
  const [method, setMethod] = useState<
    "cash_on_delivery" | "gcash" | "paymaya"
  >((booking.payment_method as any) ?? "cash_on_delivery");

  const METHODS = [
    {
      key: "cash_on_delivery",
      icon: "💵",
      label: "Cash on Delivery",
      desc: "Pay when laundry arrives",
      disabled: false,
    },
    {
      key: "gcash",
      icon: "📱",
      label: "GCash",
      desc: "Coming soon",
      disabled: true,
    },
    {
      key: "paymaya",
      icon: "💳",
      label: "PayMaya",
      desc: "Coming soon",
      disabled: true,
    },
  ];

  return (
    <StepCard title="💳 Payment Method" desc="How would you like to pay?">
      <div className="space-y-3">
        {METHODS.map((m) => (
          <div
            key={m.key}
            onClick={() => !m.disabled && setMethod(m.key as any)}
            className={clsx(
              "flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
              m.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              method === m.key
                ? "border-primary bg-primary-50"
                : "border-gray-100 hover:border-gray-200",
            )}
          >
            <span className="text-3xl">{m.icon}</span>
            <div className="flex-1">
              <p
                className={clsx(
                  "font-bold",
                  method === m.key ? "text-primary" : "text-gray-900",
                )}
              >
                {m.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
            </div>
            {m.disabled ? (
              <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-1 rounded-full">
                Soon
              </span>
            ) : method === m.key ? (
              <CheckCircle className="text-primary" size={20} />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
          </div>
        ))}
      </div>

      <StepNav
        onNext={() => {
          booking.setPaymentMethod(method);
          booking.nextStep();
        }}
        onBack={booking.prevStep}
      />
    </StepCard>
  );
}

// ─── Step 6: Confirm ──────────────────────────────────────────────────────────
function StepConfirm() {
  const navigate = useNavigate();
  const booking = useBookingStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const shop = booking.selected_shop!;
  const service = shop?.services?.find(
    (s) => s.service_type === booking.service_type,
  );
  const subtotal = (service?.price_per_kg ?? 0) * booking.estimated_weight_kg;
  const delFee =
    APP_CONFIG.deliveryFeeBase +
    (shop?.distance_km ?? 3) * APP_CONFIG.deliveryFeePerKm;
  const total = subtotal + delFee;

  const handleConfirm = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const order = await orderService.createOrder(user.id, booking);
      booking.reset();
      toast.success("🎉 Order placed successfully!");
      navigate(`/customer/orders/${order.id}`);
    } catch (err: any) {
      toast.error(err.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const rows: [string, string][] = [
    ["Shop", shop?.shop_name ?? "—"],
    ["Service", SERVICE_LABELS[booking.service_type!]],
    ["Pickup At", booking.pickup_address?.full_address ?? "—"],
    ["Date", `${booking.scheduled_date} · ${booking.scheduled_time}`],
    ["Bags", `${booking.bag_count} bag(s)`],
    ["Est. Weight", `~${booking.estimated_weight_kg} kg`],
    [
      "Payment",
      booking.payment_method === "cash_on_delivery"
        ? "💵 Cash on Delivery"
        : "📱 GCash",
    ],
  ];

  return (
    <StepCard
      title="✅ Confirm Booking"
      desc="Review your booking details before placing"
    >
      <Card className="divide-y divide-gray-50 mb-4">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-start justify-between px-4 py-3 gap-4"
          >
            <span className="text-sm text-gray-500 shrink-0">{label}</span>
            <span className="text-sm font-semibold text-gray-900 text-right">
              {value}
            </span>
          </div>
        ))}
        {booking.special_instructions && (
          <div className="flex items-start justify-between px-4 py-3 gap-4">
            <span className="text-sm text-gray-500 shrink-0">Notes</span>
            <span className="text-sm font-semibold text-gray-900 text-right">
              {booking.special_instructions}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Subtotal</span>
          <span className="text-sm font-semibold">
            {APP_CONFIG.currency}
            {subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-gray-500">Delivery Fee</span>
          <span className="text-sm font-semibold">
            {APP_CONFIG.currency}
            {delFee.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-base font-bold text-gray-900">Total</span>
          <span className="text-xl font-extrabold text-primary">
            {APP_CONFIG.currency}
            {total.toFixed(2)}
          </span>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={booking.prevStep}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back
        </Button>
        <Button
          fullWidth
          loading={loading}
          onClick={handleConfirm}
          leftIcon={<CheckCircle size={16} />}
        >
          Place Order
        </Button>
      </div>
    </StepCard>
  );
}

// ─── Shared step helpers ──────────────────────────────────────────────────────
function StepCard({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mb-5">{desc}</p>
      {children}
    </div>
  );
}

function StepNav({
  onNext,
  onBack,
  hideBack,
}: {
  onNext: () => void;
  onBack?: () => void;
  hideBack?: boolean;
}) {
  return (
    <div className="flex gap-3 mt-6">
      {!hideBack && onBack && (
        <Button
          variant="outline"
          onClick={onBack}
          leftIcon={<ArrowLeft size={16} />}
        >
          Back
        </Button>
      )}
      <Button fullWidth onClick={onNext}>
        Continue →
      </Button>
    </div>
  );
}
