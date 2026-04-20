# 🧺 LaundryLink Web

**A responsive web app for laundry pickup and delivery in the Philippines.**  
Built with React + Vite + TypeScript + Tailwind CSS + Supabase + Mapbox.

> **No React Native. No Expo. Runs in any browser.**

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MAPBOX_ACCESS_TOKEN

# 3. Run the database migration
# Open Supabase SQL Editor → paste supabase/migrations/001_initial_schema.sql → Run

# 4. Start development server
npm run dev
# Opens at http://localhost:3000

# 5. Build for production
npm run build
```

---

## 🏗️ Project Structure

```
laundrylink-web/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── package.json
├── tsconfig.json
├── .env.example
│
├── src/
│   ├── main.tsx                        # Entry point
│   ├── App.tsx                         # Root component + auth init
│   ├── index.css                       # Tailwind + global styles
│   │
│   ├── types/index.ts                  # All TypeScript interfaces
│   ├── constants/index.ts              # Colors, labels, config
│   │
│   ├── services/
│   │   ├── supabase.ts                 # Supabase client (localStorage)
│   │   ├── auth.service.ts             # Auth (sign up/in/out/reset)
│   │   ├── order.service.ts            # Orders CRUD + real-time
│   │   ├── shop-rider.service.ts       # Shop + Rider services
│   │   └── address.service.ts          # Addresses + Mapbox geocoding
│   │
│   ├── store/
│   │   ├── auth.store.ts               # Auth Zustand store
│   │   └── booking.store.ts            # Multi-step booking state
│   │
│   ├── router/index.tsx                # React Router + auth guards
│   │
│   ├── components/
│   │   ├── ui/index.tsx                # Button, Input, Badge, Modal, Toggle…
│   │   ├── layout/DashboardLayout.tsx  # Sidebar + topbar shell
│   │   └── common/Cards.tsx            # OrderCard, ShopCard, StatCard
│   │
│   └── pages/
│       ├── auth/AuthPages.tsx          # Login + Register
│       ├── customer/
│       │   ├── HomePage.tsx            # Customer dashboard
│       │   ├── BookingPage.tsx         # 7-step booking wizard
│       │   └── OrdersPage.tsx          # Orders list + detail
│       └── dashboards.tsx             # Rider + Shop + Admin dashboards
│
└── supabase/
    ├── migrations/001_initial_schema.sql
    └── functions/notify-order-update/index.ts
```

---

## 🔑 Environment Variables

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key |
| `VITE_MAPBOX_ACCESS_TOKEN` | account.mapbox.com → Access Tokens |

---

## 🗄️ Supabase Setup

1. Create project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `supabase/migrations/001_initial_schema.sql`
3. Go to **Database → Replication** → enable Realtime for `orders` and `rider_profiles`  
   OR run in SQL Editor:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
   ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_profiles;
   ```
4. Create a **Storage bucket** named `avatars` (set to public)

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Routing | React Router v6 |
| State Management | Zustand |
| Backend / Database | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Maps & Geocoding | Mapbox GL JS + Mapbox Geocoding API |
| Icons | Lucide React |
| Notifications (UI) | React Hot Toast |
| Date Utilities | date-fns |

---

## 🔄 Key Differences from the React Native Version

| Feature | Old (React Native/Expo) | New (Web) |
|---|---|---|
| Session storage | `expo-secure-store` | Browser `localStorage` |
| Location API | `expo-location` | `navigator.geolocation` |
| Push notifications | `expo-notifications` | Web Push API (Supabase Edge Function) |
| Maps | `react-native-maps` | `mapbox-gl` |
| Navigation | React Navigation | React Router v6 |
| Styling | StyleSheet + `StyleSheet.create` | Tailwind CSS |
| Layout | `View`, `Text`, `FlatList` | `div`, `p`, standard HTML |
| Environment | `expo-constants` | `import.meta.env` (Vite) |
| Entry | `expo-router/entry` | `index.html` + Vite |

---

## 🌐 Deployment

### Vercel (Recommended — Free)
```bash
npm install -g vercel
vercel --prod
# Set environment variables in Vercel dashboard
```

### Netlify (Free)
```bash
npm run build
# Drag and drop the /dist folder to netlify.com/drop
# Set environment variables in Netlify dashboard
```

### Manual (any static host)
```bash
npm run build   # generates /dist
# Upload /dist to any static host (GitHub Pages, Render, Cloudflare Pages, etc.)
```

---

## 🗺️ Booking Flow

```
Step 1 → Pickup Address  (Mapbox autocomplete)
Step 2 → Schedule        (date picker + time slots)
Step 3 → Laundry Details (bag count, weight, notes)
Step 4 → Service Type    (Wash & Fold, Express, etc.)
Step 5 → Shop Selection  (Nearest / Cheapest / Fastest)
Step 6 → Payment Method  (COD + GCash concept)
Step 7 → Confirm & Place
```

---

## 👤 User Roles

| Role | Default Route | Dashboard Features |
|---|---|---|
| Customer | `/customer` | Home, Book, Orders, Profile |
| Rider | `/rider` | Go online, GPS tracking, Accept/deliver orders |
| Shop Owner | `/shop` | Order tabs, Status updates, Toggle open/close |
| Admin | `/admin` | System stats, User/shop management |

---

## 🇵🇭 Philippine Market Notes

- Currency: PHP (₱)  
- Default location bias: Metro Manila  
- Mapbox geocoding restricted to `country=PH`  
- COD is the primary payment method  
- GCash/PayMaya listed as concept/coming soon

---

## 👨‍💻 Author

Joseph — BSIT Student, ICAS-Sucat  
Technopreneurship Project, 2025–2026

---

## 📄 License

MIT License
