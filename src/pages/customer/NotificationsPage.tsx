import React, { useEffect, useState, useCallback } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../../store/auth.store";
import supabase from "../../services/supabase";
import { AppNotification } from "../../types";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Button, Card, PageSpinner, EmptyState } from "../../components/ui";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";

const TYPE_ICON: Record<string, string> = {
  order_update: "📦",
  promo: "🎉",
  system: "🔔",
};

const TYPE_COLOR: Record<string, string> = {
  order_update: "bg-blue-50 border-blue-100",
  promo: "bg-amber-50 border-amber-100",
  system: "bg-gray-50 border-gray-100",
};

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifs(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: new notifications appear instantly
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notifs:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifs((prev) => [payload.new as AppNotification, ...prev]);
          // Show a toast for the new notification
          const n = payload.new as AppNotification;
          toast(n.body, { icon: TYPE_ICON[n.type] ?? "🔔", duration: 4000 });
        },
      )
      .subscribe();
    return () => {
      ch.unsubscribe();
    };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All marked as read");
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  };

  const deleteNotif = async (id: string) => {
    setDeleting(id);
    await supabase.from("notifications").delete().eq("id", id);
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    setDeleting(null);
  };

  const clearAll = async () => {
    if (!user || !confirm("Clear all notifications?")) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifs([]);
    toast.success("Notifications cleared");
  };

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  if (loading)
    return (
      <DashboardLayout title="Notifications">
        <PageSpinner />
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="Notifications">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Bell size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="font-extrabold text-gray-900">Notifications</h2>
            <p className="text-xs text-gray-400">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>
        </div>
        {notifs.length > 0 && (
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<CheckCheck size={14} />}
                onClick={markAllRead}
              >
                Mark all read
              </Button>
            )}
            <Button
              size="sm"
              variant="danger"
              leftIcon={<Trash2 size={14} />}
              onClick={clearAll}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Notification list */}
      {notifs.length === 0 ? (
        <EmptyState
          emoji="🔔"
          title="No notifications yet"
          subtitle="Order updates, promos, and system messages will appear here."
        />
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={clsx(
                "flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-card",
                TYPE_COLOR[n.type] ?? "bg-white border-gray-100",
                !n.is_read && "ring-1 ring-primary/20",
              )}
            >
              {/* Icon */}
              <div className="text-2xl shrink-0 mt-0.5">
                {TYPE_ICON[n.type] ?? "🔔"}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={clsx(
                      "text-sm font-bold",
                      !n.is_read ? "text-gray-900" : "text-gray-600",
                    )}
                  >
                    {n.title}
                  </p>
                  {!n.is_read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {n.body}
                </p>
                <p className="text-xs text-gray-400 mt-1.5">
                  {formatDistanceToNow(new Date(n.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotif(n.id);
                }}
                disabled={deleting === n.id}
                className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
