import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListOrdersQueryKey,
  getListOrdersByTableQueryKey,
  getGetQueueSummaryQueryKey,
  getGetTodayStatsQueryKey,
  getGetPopularItemsQueryKey,
} from "@workspace/api-client-react";

export interface OrderEvent {
  type: "created" | "updated";
  orderId: number;
  tableNumber: number;
  status: string;
  at: string;
}

export interface UseOrderEventsOptions {
  tableNumber?: number;
  onEvent?: (event: OrderEvent) => void;
}

export function useOrderEvents(options: UseOrderEventsOptions = {}): void {
  const { tableNumber, onEvent } = options;
  const queryClient = useQueryClient();

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/orders/stream`;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const invalidate = (event: OrderEvent): void => {
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetQueueSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTodayStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPopularItemsQueryKey() });
      if (tableNumber !== undefined) {
        queryClient.invalidateQueries({
          queryKey: getListOrdersByTableQueryKey(tableNumber),
        });
      }
      if (event.tableNumber !== undefined) {
        queryClient.invalidateQueries({
          queryKey: getListOrdersByTableQueryKey(event.tableNumber),
        });
      }
    };

    const connect = (): void => {
      if (closed) return;
      es = new EventSource(url);

      es.addEventListener("order", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data) as OrderEvent;
          invalidate(data);
          onEvent?.(data);
        } catch {
          // ignore parse errors
        }
      });

      es.onerror = () => {
        es?.close();
        es = null;
        if (closed) return;
        reconnectTimer = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [queryClient, tableNumber, onEvent]);
}
