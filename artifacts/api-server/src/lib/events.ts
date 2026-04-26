import { EventEmitter } from "node:events";

export type OrderEventType = "created" | "updated";

export interface OrderEventPayload {
  type: OrderEventType;
  orderId: number;
  tableNumber: number;
  status: string;
  at: string;
}

class OrderEventBus extends EventEmitter {}

export const orderEvents: OrderEventBus = new OrderEventBus();
orderEvents.setMaxListeners(1000);

export function emitOrderEvent(payload: OrderEventPayload): void {
  orderEvents.emit("order", payload);
}
