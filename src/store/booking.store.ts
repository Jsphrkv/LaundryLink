import { create } from 'zustand';
import { BookingState, Address, ServiceType, ShopProfile, PaymentMethod, ShopFilter } from '../types';

interface BookingStore extends BookingState {
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setPickupAddress: (address: Address) => void;
  setSchedule: (date: string, time: string) => void;
  setLaundryDetails: (bagCount: number, weight: number, instructions?: string) => void;
  setServiceType: (service: ServiceType) => void;
  setShopFilter: (filter: ShopFilter) => void;
  setSelectedShop: (shop: ShopProfile) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  reset: () => void;
}

const initial: BookingState = {
  step: 0,
  pickup_address: undefined,
  scheduled_date: undefined,
  scheduled_time: undefined,
  bag_count: 1,
  estimated_weight_kg: 3,
  special_instructions: undefined,
  service_type: undefined,
  shop_filter: 'nearest',
  selected_shop: undefined,
  payment_method: undefined,
};

export const useBookingStore = create<BookingStore>((set) => ({
  ...initial,
  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: s.step + 1 })),
  prevStep: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  setPickupAddress: (pickup_address) => set({ pickup_address }),
  setSchedule: (scheduled_date, scheduled_time) => set({ scheduled_date, scheduled_time }),
  setLaundryDetails: (bag_count, estimated_weight_kg, special_instructions) =>
    set({ bag_count, estimated_weight_kg, special_instructions }),
  setServiceType: (service_type) => set({ service_type }),
  setShopFilter: (shop_filter) => set({ shop_filter }),
  setSelectedShop: (selected_shop) => set({ selected_shop }),
  setPaymentMethod: (payment_method) => set({ payment_method }),
  reset: () => set({ ...initial }),
}));
