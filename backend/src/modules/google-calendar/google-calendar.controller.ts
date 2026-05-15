import type { Request, Response } from "express";
import { googleCalendarService } from "./google-calendar.service";

export const googleCalendarController = {
  async getAuthUrl(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const url = googleCalendarService.getAuthUrl(userId);
      res.json({ url });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Erro" });
    }
  },

  async callback(req: Request, res: Response) {
    const { code, state: userId } = req.query as { code?: string; state?: string };
    if (!code || !userId) {
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/perfil?calendar=error`);
    }
    try {
      await googleCalendarService.handleCallback(code, userId);
      res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/perfil?calendar=success`);
    } catch {
      res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/perfil?calendar=error`);
    }
  },

  async disconnect(req: Request, res: Response) {
    await googleCalendarService.disconnectUser(req.user!.id);
    res.json({ ok: true });
  },

  async getUserStatus(req: Request, res: Response) {
    const status = await googleCalendarService.getUserStatus(req.user!.id);
    res.json(status);
  },

  async getTeamAuthUrl(_req: Request, res: Response) {
    try {
      const url = googleCalendarService.getTeamAuthUrl();
      res.json({ url });
    } catch (err: unknown) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Erro" });
    }
  },

  async teamCallback(req: Request, res: Response) {
    const { code } = req.query as { code?: string };
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/configuracoes?calendar=error`);
    }
    try {
      await googleCalendarService.handleTeamCallback(code);
      res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/configuracoes?calendar=success`);
    } catch {
      res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/configuracoes?calendar=error`);
    }
  },

  async disconnectTeam(_req: Request, res: Response) {
    await googleCalendarService.disconnectTeam();
    res.json({ ok: true });
  },

  async getTeamStatus(_req: Request, res: Response) {
    const status = await googleCalendarService.getTeamStatus();
    res.json(status);
  },
};
