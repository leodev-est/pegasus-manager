import { api } from "./api";

export type PixPaymentResult = {
  paymentId: number;
  qrCodeBase64: string | null;
  qrCode: string | null;
  expiresAt: string | null;
  status: string;
};

export const pixService = {
  async generatePix(paymentId: string, email?: string): Promise<PixPaymentResult> {
    const { data } = await api.post<PixPaymentResult>(`/pix/payment/${paymentId}/generate`, { email });
    return data;
  },
};
