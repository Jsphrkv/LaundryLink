-- ============================================================
-- LaundryLink — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  role          TEXT NOT NULL CHECK (role IN ('customer', 'rider', 'shop_owner', 'admin')) DEFAULT 'customer',
  avatar_url    TEXT,
  is_verified   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CUSTOMER PROFILES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  default_address_id UUID,
  total_orders    INTEGER DEFAULT 0,
  loyalty_points  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RIDER PROFILES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rider_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  vehicle_type      TEXT CHECK (vehicle_type IN ('motorcycle', 'bicycle', 'tricycle')),
  vehicle_plate     TEXT,
  license_number    TEXT,
  bank_account      TEXT,
  gcash_number      TEXT,
  status            TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'on_delivery')),
  current_lat       NUMERIC(10, 7),
  current_lng       NUMERIC(10, 7),
  rating            NUMERIC(3, 2) DEFAULT 5.00,
  total_deliveries  INTEGER DEFAULT 0,
  is_kyc_verified   BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SHOP PROFILES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  shop_name       TEXT NOT NULL DEFAULT '',
  description     TEXT,
  address         TEXT NOT NULL DEFAULT '',
  lat             NUMERIC(10, 7) DEFAULT 0,
  lng             NUMERIC(10, 7) DEFAULT 0,
  phone           TEXT DEFAULT '',
  logo_url        TEXT,
  banner_url      TEXT,
  operating_hours JSONB DEFAULT '{}'::jsonb,
  rating          NUMERIC(3, 2) DEFAULT 5.00,
  total_reviews   INTEGER DEFAULT 0,
  is_open         BOOLEAN DEFAULT FALSE,
  is_verified     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SHOP SERVICES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shop_services (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id         UUID NOT NULL REFERENCES public.shop_profiles(id) ON DELETE CASCADE,
  service_type    TEXT NOT NULL CHECK (service_type IN ('wash_fold', 'wash_dry', 'express', 'dry_clean', 'ironing')),
  price_per_kg    NUMERIC(8, 2) NOT NULL DEFAULT 60.00,
  minimum_kg      NUMERIC(4, 1) DEFAULT 1.0,
  estimated_hours INTEGER DEFAULT 24,
  is_available    BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (shop_id, service_type)
);

-- ─── ADDRESSES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.addresses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label        TEXT NOT NULL DEFAULT 'Home',
  full_address TEXT NOT NULL,
  barangay     TEXT DEFAULT '',
  city         TEXT DEFAULT '',
  province     TEXT DEFAULT '',
  lat          NUMERIC(10, 7) DEFAULT 0,
  lng          NUMERIC(10, 7) DEFAULT 0,
  is_default   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ORDERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number            TEXT NOT NULL UNIQUE,
  customer_id             UUID NOT NULL REFERENCES public.users(id),
  shop_id                 UUID NOT NULL REFERENCES public.shop_profiles(id),
  rider_id                UUID REFERENCES public.rider_profiles(id),
  pickup_address_id       UUID NOT NULL REFERENCES public.addresses(id),
  service_type            TEXT NOT NULL CHECK (service_type IN ('wash_fold', 'wash_dry', 'express', 'dry_clean', 'ironing')),
  scheduled_pickup_date   DATE NOT NULL,
  scheduled_pickup_time   TEXT NOT NULL,
  estimated_weight_kg     NUMERIC(5, 1) DEFAULT 3.0,
  actual_weight_kg        NUMERIC(5, 1),
  special_instructions    TEXT,
  bag_count               INTEGER DEFAULT 1,
  status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'rider_assigned', 'rider_on_way_pickup',
    'picked_up', 'washing', 'ready_for_delivery', 'rider_on_way_delivery',
    'delivered', 'cancelled', 'refunded'
  )),
  payment_method          TEXT NOT NULL DEFAULT 'cash_on_delivery' CHECK (payment_method IN ('cash_on_delivery', 'gcash', 'paymaya')),
  payment_status          TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  subtotal                NUMERIC(10, 2) NOT NULL DEFAULT 0,
  delivery_fee            NUMERIC(8, 2) NOT NULL DEFAULT 0,
  total_amount            NUMERIC(10, 2) NOT NULL DEFAULT 0,
  estimated_completion    TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ORDER STATUS HISTORY ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status      TEXT NOT NULL,
  note        TEXT,
  created_by  UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ORDER RATINGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_ratings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
  customer_id   UUID NOT NULL REFERENCES public.users(id),
  shop_rating   INTEGER NOT NULL CHECK (shop_rating BETWEEN 1 AND 5),
  rider_rating  INTEGER CHECK (rider_rating BETWEEN 1 AND 5),
  shop_comment  TEXT,
  rider_comment TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       TEXT DEFAULT 'order_update' CHECK (type IN ('order_update', 'promo', 'system')),
  order_id   UUID REFERENCES public.orders(id),
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PUSH TOKENS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   TEXT DEFAULT 'expo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, token)
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop     ON public.orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider    ON public.orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_addresses_user  ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_shop_services_shop ON public.shop_services(shop_id);
CREATE INDEX IF NOT EXISTS idx_riders_status ON public.rider_profiles(status);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_riders_updated
  BEFORE UPDATE ON public.rider_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_shops_updated
  BEFORE UPDATE ON public.shop_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RATING UPDATE FUNCTION ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_shop_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.shop_profiles
  SET rating = (
    SELECT ROUND(AVG(shop_rating)::numeric, 2)
    FROM public.order_ratings
    WHERE order_id IN (
      SELECT id FROM public.orders WHERE shop_id = (
        SELECT shop_id FROM public.orders WHERE id = NEW.order_id
      )
    )
  ),
  total_reviews = (
    SELECT COUNT(*)
    FROM public.order_ratings
    WHERE order_id IN (
      SELECT id FROM public.orders WHERE shop_id = (
        SELECT shop_id FROM public.orders WHERE id = NEW.order_id
      )
    )
  )
  WHERE id = (SELECT shop_id FROM public.orders WHERE id = NEW.order_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_shop_rating
  AFTER INSERT ON public.order_ratings
  FOR EACH ROW EXECUTE FUNCTION update_shop_rating();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_ratings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens       ENABLE ROW LEVEL SECURITY;

-- Users: read own profile, update own profile
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Shops: anyone can view verified shops
CREATE POLICY "shops_public_read" ON public.shop_profiles FOR SELECT USING (is_verified = TRUE OR user_id = auth.uid());
CREATE POLICY "shops_owner_write" ON public.shop_profiles FOR ALL USING (user_id = auth.uid());

-- Shop services: public read, owner write
CREATE POLICY "services_public_read" ON public.shop_services FOR SELECT USING (TRUE);
CREATE POLICY "services_owner_write" ON public.shop_services
  FOR ALL USING (
    shop_id IN (SELECT id FROM public.shop_profiles WHERE user_id = auth.uid())
  );

-- Addresses: own only
CREATE POLICY "addresses_own" ON public.addresses FOR ALL USING (user_id = auth.uid());

-- Orders: customer sees own, shop sees own, rider sees own
CREATE POLICY "orders_customer" ON public.orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "orders_shop" ON public.orders FOR SELECT
  USING (shop_id IN (SELECT id FROM public.shop_profiles WHERE user_id = auth.uid()));
CREATE POLICY "orders_rider" ON public.orders FOR SELECT
  USING (rider_id IN (SELECT id FROM public.rider_profiles WHERE user_id = auth.uid()));
CREATE POLICY "orders_insert" ON public.orders FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "orders_update_shop" ON public.orders FOR UPDATE
  USING (shop_id IN (SELECT id FROM public.shop_profiles WHERE user_id = auth.uid()));
CREATE POLICY "orders_update_rider" ON public.orders FOR UPDATE
  USING (rider_id IN (SELECT id FROM public.rider_profiles WHERE user_id = auth.uid()));

-- Notifications: own only
CREATE POLICY "notifs_own" ON public.notifications FOR ALL USING (user_id = auth.uid());

-- Rider profiles: public select (for tracking), own write
CREATE POLICY "riders_public_select" ON public.rider_profiles FOR SELECT USING (TRUE);
CREATE POLICY "riders_own_write" ON public.rider_profiles FOR ALL USING (user_id = auth.uid());

-- Push tokens: own only
CREATE POLICY "tokens_own" ON public.push_tokens FOR ALL USING (user_id = auth.uid());

-- ─── SEED DATA (Sample Shops) ─────────────────────────────────────────────────
-- Run this after you have at least one shop_owner user registered

-- Example seed shop services (update shop_id after creating shops):
-- INSERT INTO public.shop_services (shop_id, service_type, price_per_kg, minimum_kg, estimated_hours)
-- VALUES
--   ('<shop-uuid>', 'wash_fold', 60.00, 2.0, 24),
--   ('<shop-uuid>', 'wash_dry',  75.00, 2.0, 24),
--   ('<shop-uuid>', 'express',   90.00, 1.0, 8),
--   ('<shop-uuid>', 'ironing',   35.00, 1.0, 12);
