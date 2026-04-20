import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "../store/auth.store";
import { LoginPage, RegisterPage } from "../pages/auth/AuthPages";
import CustomerHomePage from "../pages/customer/HomePage";
import BookingPage from "../pages/customer/BookingPage";
import { OrdersPage, OrderDetailPage } from "../pages/customer/OrdersPage";
import { RiderDashboardPage } from "../pages/rider/RiderDashboard";
import RiderOrdersPage from "../pages/rider/OrdersPage";
import RiderEarningsPage from "../pages/rider/EarningsPage";
import { ShopDashboardPage } from "../pages/shop/ShopDashboard";
import ShopServicesPage from "../pages/shop/ServicesPage";
import ShopOrdersPage from "../pages/shop/OrdersPage";
import { AdminDashboardPage } from "../pages/admin/AdminDashboard";
import AdminUsersPage from "../pages/admin/UsersPage";
import AdminShopsPage from "../pages/admin/ShopsPage";
import AdminRidersPage from "../pages/admin/RidersPage";
import AdminOrdersPage from "../pages/admin/OrdersPage";
import AdminAnalyticsPage from "../pages/admin/AnalyticsPage";
import {
  AdminSendAlertPage,
  AdminSettingsPage,
} from "../pages/admin/AlertSettingsPage";
import ProfilePage from "../pages/profile/ProfilePage";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { EmptyState } from "../components/ui";

function NotificationsPage() {
  return (
    <DashboardLayout title="Notifications">
      <EmptyState
        emoji="🔔"
        title="Notifications"
        subtitle="You have no new notifications."
      />
    </DashboardLayout>
  );
}

function HomeRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  switch (user.role) {
    case "rider":
      return <Navigate to="/rider" replace />;
    case "shop_owner":
      return <Navigate to="/shop" replace />;
    case "admin":
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/customer" replace />;
  }
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore();
  if (!isInitialized)
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <span className="text-5xl block mb-4">🧺</span>
          <p className="text-gray-500 text-sm font-medium">
            Loading LaundryLink…
          </p>
        </div>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, isInitialized } = useAuthStore();
  if (!isInitialized) return null;
  if (user) return <HomeRedirect />;
  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "12px",
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            fontWeight: 600,
          },
          success: { iconTheme: { primary: "#2DC653", secondary: "#fff" } },
          error: { iconTheme: { primary: "#E63946", secondary: "#fff" } },
        }}
      />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          }
        />
        {/* Customer */}
        <Route
          path="/customer"
          element={
            <RequireAuth>
              <CustomerHomePage />
            </RequireAuth>
          }
        />
        <Route
          path="/customer/book"
          element={
            <RequireAuth>
              <BookingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/customer/orders"
          element={
            <RequireAuth>
              <OrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/customer/orders/:id"
          element={
            <RequireAuth>
              <OrderDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/customer/notifications"
          element={
            <RequireAuth>
              <NotificationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/customer/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        {/* Rider */}
        <Route
          path="/rider"
          element={
            <RequireAuth>
              <RiderDashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/rider/orders"
          element={
            <RequireAuth>
              <RiderOrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/rider/earnings"
          element={
            <RequireAuth>
              <RiderEarningsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/rider/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        {/* Shop */}
        <Route
          path="/shop"
          element={
            <RequireAuth>
              <ShopDashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/shop/orders"
          element={
            <RequireAuth>
              <ShopOrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/shop/services"
          element={
            <RequireAuth>
              <ShopServicesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/shop/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        {/* Admin */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminDashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAuth>
              <AdminUsersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/shops"
          element={
            <RequireAuth>
              <AdminShopsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/riders"
          element={
            <RequireAuth>
              <AdminRidersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/orders"
          element={
            <RequireAuth>
              <AdminOrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <RequireAuth>
              <AdminAnalyticsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/alerts"
          element={
            <RequireAuth>
              <AdminSendAlertPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RequireAuth>
              <AdminSettingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="*"
          element={
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
              <span className="text-6xl">🤷</span>
              <h1 className="text-2xl font-extrabold text-gray-900">
                Page not found
              </h1>
              <a href="/" className="text-primary font-bold hover:underline">
                ← Go Home
              </a>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
