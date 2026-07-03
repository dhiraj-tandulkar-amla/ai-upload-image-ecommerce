import { Product } from "./product";

export interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  sessionId: string;
  createdAt: string;
  product?: Product & { sku?: string; size?: string; description?: string };
}
