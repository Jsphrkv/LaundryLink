import { useEffect, useRef } from "react";
import supabase from "../services/supabase";

/**
 * Subscribes to real-time order changes and calls `onUpdate` whenever
 * any matching order is updated. No manual refresh needed.
 *
 * @param filter   Supabase filter string e.g. "customer_id=eq.abc123"
 * @param onUpdate Callback to re-fetch data
 * @param channelId Unique channel name (avoids conflicts)
 */
export function useRealtimeOrders(
  filter: string | null,
  onUpdate: () => void,
  channelId: string,
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate; // always use latest version

  useEffect(() => {
    if (!filter) return;

    const ch = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter,
        },
        () => {
          onUpdateRef.current();
        },
      )
      .subscribe();

    return () => {
      ch.unsubscribe();
    };
  }, [filter, channelId]);
}
