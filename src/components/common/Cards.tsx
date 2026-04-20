import React from 'react';
import clsx from 'clsx';
import { MapPin, Clock, Package, Star, ChevronRight } from 'lucide-react';
import { Order, ShopProfile } from '../../types';
import { SERVICE_LABELS, APP_CONFIG } from '../../constants';
import { StatusBadge, Card } from '../ui';

// ─── OrderCard ────────────────────────────────────────────────────────────────
export function OrderCard({ order, onClick }: { order: Order; onClick?: () => void }) {
  return (
    <Card
      className={clsx('p-4 transition-shadow', onClick && 'hover:shadow-elevated cursor-pointer')}
      // @ts-ignore
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-gray-900 text-sm">{order.order_number}</p>
          <p className="text-xs text-gray-400 mt-0.5">{(order as any).shop?.shop_name ?? '—'}</p>
        </div>
        <StatusBadge status={order.status} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Package size={12} />
          {SERVICE_LABELS[order.service_type]}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock size={12} />
          {order.scheduled_pickup_date}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span>⚖️</span>
          ~{order.estimated_weight_kg}kg · {order.bag_count} bag{order.bag_count > 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span>{order.payment_method === 'cash_on_delivery' ? '💵' : '📱'}</span>
          {order.payment_method === 'cash_on_delivery' ? 'Cash on Delivery' : 'GCash'}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <span className="text-xl font-extrabold text-primary">
          {APP_CONFIG.currency}{order.total_amount.toFixed(2)}
        </span>
        {onClick && <ChevronRight size={16} className="text-gray-400" />}
      </div>
    </Card>
  );
}

// ─── ShopCard ─────────────────────────────────────────────────────────────────
export function ShopCard({
  shop, selected, onClick,
}: { shop: ShopProfile; selected?: boolean; onClick?: () => void }) {
  const minPrice = shop.services?.length
    ? Math.min(...shop.services.map(s => s.price_per_kg))
    : 0;
  const minEta = shop.services?.length
    ? Math.min(...shop.services.map(s => s.estimated_hours))
    : 0;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-xl border-2 p-4 transition-all cursor-pointer',
        selected
          ? 'border-primary bg-primary-50 shadow-elevated'
          : 'border-gray-100 hover:border-primary-200 hover:shadow-card'
      )}
    >
      <div className="flex gap-3 mb-3">
        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
          {shop.logo_url
            ? <img src={shop.logo_url} alt={shop.shop_name} className="w-full h-full rounded-xl object-cover" />
            : '🏪'
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-gray-900 truncate">{shop.shop_name}</p>
            {selected && <span className="text-primary text-lg shrink-0">✓</span>}
          </div>
          <p className="text-xs text-gray-400 truncate mt-0.5">{shop.address}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              <MapPin size={9} />{shop.distance_km?.toFixed(1) ?? '—'} km
            </span>
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              <Star size={9} />{shop.rating.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              <Clock size={9} />{minEta}h
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">Starting from</span>
        <span className="text-base font-extrabold text-primary">{APP_CONFIG.currency}{minPrice}/kg</span>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({
  emoji, label, value, color = 'bg-blue-50',
}: { emoji: string; label: string; value: string | number; color?: string }) {
  return (
    <div className={clsx('rounded-xl p-4 flex flex-col gap-1', color)}>
      <span className="text-2xl">{emoji}</span>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  );
}
