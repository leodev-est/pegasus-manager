import type { Request, Response } from "express";
import { reportsService } from "./reports.service";

export const reportsController = {
  async list(_req: Request, res: Response) {
    const reports = await reportsService.list();
    res.json(reports.map((r) => ({
      id: r.id,
      month: r.month,
      fileName: r.fileName,
      fileSize: r.fileSize,
      generatedAt: r.generatedAt,
      sentAt: r.sentAt,
    })));
  },

  async generate(req: Request, res: Response) {
    const { month } = req.query as { month?: string };
    try {
      const report = await reportsService.generate(month);
      res.json({
        id: report.id,
        month: report.month,
        fileName: report.fileName,
        fileSize: report.fileSize,
        generatedAt: report.generatedAt,
        sentAt: report.sentAt,
      });
    } catch (err: unknown) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Erro ao gerar relatório" });
    }
  },

  async download(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { content, fileName } = await reportsService.download(id);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.send(content);
    } catch (err: unknown) {
      res.status(404).json({ error: err instanceof Error ? err.message : "Relatório não encontrado" });
    }
  },
};
