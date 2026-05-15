import { api } from "./api";

export type UniformItem = {
  id: string;
  name: string;
  description: string | null;
  stock: number;
  minStock: number;
  deliveryCount: number;
  createdAt: string;
  updatedAt: string;
};

export type UniformDelivery = {
  id: string;
  uniformItemId: string;
  athleteId: string;
  quantity: number;
  deliveredAt: string;
  notes: string | null;
  deliveredBy: string | null;
  createdAt: string;
  updatedAt: string;
  uniformItem: { id: string; name: string };
  athlete: { id: string; name: string };
};

export type UniformItemPayload = {
  name: string;
  description?: string | null;
  stock: number;
  minStock?: number;
};

export type DeliveryPayload = {
  uniformItemId: string;
  athleteId: string;
  quantity: number;
  deliveredAt?: string;
  notes?: string | null;
  deliveredBy?: string | null;
};

export const uniformsService = {
  async getItems() {
    const { data } = await api.get<UniformItem[]>("/uniforms/items");
    return data;
  },
  async getLowStock() {
    const { data } = await api.get<UniformItem[]>("/uniforms/items/low-stock");
    return data;
  },
  async createItem(payload: UniformItemPayload) {
    const { data } = await api.post<UniformItem>("/uniforms/items", payload);
    return data;
  },
  async updateItem(id: string, payload: Partial<UniformItemPayload>) {
    const { data } = await api.patch<UniformItem>(`/uniforms/items/${id}`, payload);
    return data;
  },
  async deleteItem(id: string) {
    await api.delete(`/uniforms/items/${id}`);
  },
  async getDeliveries(params?: { athleteId?: string; uniformItemId?: string }) {
    const { data } = await api.get<UniformDelivery[]>("/uniforms/deliveries", { params });
    return data;
  },
  async createDelivery(payload: DeliveryPayload) {
    const { data } = await api.post<UniformDelivery>("/uniforms/deliveries", payload);
    return data;
  },
  async deleteDelivery(id: string) {
    await api.delete(`/uniforms/deliveries/${id}`);
  },
};
