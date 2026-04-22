import { useEffect, useState } from "react";
import supabase from "../services/supabase";
import { useAuthStore } from "../store/auth.store";

export function useUnreadNotifications() {
  const { user } = useAuthStore();
  const [count, setCount] = useState(0);

  const fetch = async () => {
    if (!user) return;
    const { count: c } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setCount(c ?? 0);
  };

  useEffect(() => {
    fetch();
    if (!user) return;
    const ch = supabase
      .channel(`notif_badge:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetch(),
      )
      .subscribe();
    return () => {
      ch.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return count;
}
