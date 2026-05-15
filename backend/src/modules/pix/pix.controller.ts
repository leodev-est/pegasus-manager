import type { Request, Response } from "express";
import { pixService } from "./pix.service";

export const pixController = {
  async generatePix(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const payerEmail = (req.body as { email?: string }).email ?? req.user?.email ?? "atleta@pegasus.com";
      const result = await pixService.generatePixPayment(paymentId, payerEmail);
      res.json(result);
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Erro ao gerar PIX" });
    }
  },

  async webhook(req: Request, res: Response) {
    const signature = req.headers["x-signature"] as string | undefined;
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
    try {
      const result = await pixService.handleWebhook(req.body as Record<string, unknown>, signature, rawBody);
      res.json(result);
    } catch {
      res.status(200).json({ ok: true });
    }
  },
};
