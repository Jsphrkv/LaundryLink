export const APP_CONFIG = {
  currency: "₱",
  currencyCode: "PHP",
  defaultCity: "Parañaque City",
  deliveryFeeBase: 50,
  deliveryFeePerKm: 15,
  maxDeliveryRadiusKm: 20,
  supportEmail: "support@laundrylink.ph",
  supportPhone: "+63 912 345 6789",
  // Metro Manila center coords
  defaultLng: 121.0194,
  defaultLat: 14.5086,
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  rider_assigned: "Rider Assigned",
  rider_on_way_pickup: "Rider Heading to You",
  picked_up: "Picked Up — At Shop",
  confirmed: "Arrived at Shop", // repurposed: laundry dropped off at shop
  washing: "Washing in Progress",
  ready_for_delivery: "Ready for Pickup",
  rider_on_way_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const ORDER_STATUS_COLORS: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  pending: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    dot: "bg-yellow-400",
  },
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  rider_assigned: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    dot: "bg-orange-400",
  },
  rider_on_way_pickup: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    dot: "bg-orange-400",
  },
  picked_up: { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500" },
  washing: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  ready_for_delivery: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
  },
  rider_on_way_delivery: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
  delivered: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  refunded: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
};

export const SERVICE_LABELS: Record<string, string> = {
  wash_fold: "Wash & Fold",
  wash_dry: "Wash & Dry",
  express: "Express",
  dry_clean: "Dry Clean",
  ironing: "Ironing",
};

export const SERVICE_META: Record<
  string,
  { icon: string; eta: string; hint: string; color: string }
> = {
  wash_fold: {
    icon: "👕",
    eta: "24-48 hrs",
    hint: "Most popular",
    color: "bg-blue-50 border-blue-200",
  },
  wash_dry: {
    icon: "💨",
    eta: "24-36 hrs",
    hint: "Great value",
    color: "bg-green-50 border-green-200",
  },
  express: {
    icon: "⚡",
    eta: "6-12 hrs",
    hint: "+20% surcharge",
    color: "bg-amber-50 border-amber-200",
  },
  dry_clean: {
    icon: "🧴",
    eta: "48-72 hrs",
    hint: "Premium care",
    color: "bg-purple-50 border-purple-200",
  },
  ironing: {
    icon: "👔",
    eta: "12-24 hrs",
    hint: "Add-on friendly",
    color: "bg-pink-50 border-pink-200",
  },
};

export const TIME_SLOTS = [
  "08:00 AM – 10:00 AM",
  "10:00 AM – 12:00 PM",
  "12:00 PM – 02:00 PM",
  "02:00 PM – 04:00 PM",
  "04:00 PM – 06:00 PM",
];

// Correct flow: Rider picks up from CUSTOMER → drops at SHOP → shop washes
// → rider picks up from SHOP → delivers back to CUSTOMER
export const STATUS_TIMELINE = [
  { status: "pending", icon: "🕐", label: "Order Placed" },
  { status: "rider_assigned", icon: "🛵", label: "Rider Assigned" },
  { status: "rider_on_way_pickup", icon: "📍", label: "Rider Heading to You" },
  { status: "picked_up", icon: "📦", label: "Picked Up — Heading to Shop" },
  { status: "confirmed", icon: "🏪", label: "Arrived at Laundry Shop" },
  { status: "washing", icon: "🫧", label: "Washing in Progress" },
  { status: "ready_for_delivery", icon: "✨", label: "Ready for Pickup" },
  { status: "rider_on_way_delivery", icon: "🚀", label: "Out for Delivery" },
  { status: "delivered", icon: "🎉", label: "Delivered!" },
];
