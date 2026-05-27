import type { RequestHandler } from "express";
import { muralService } from "./mural.service";
import { pushService } from "../push/push.service";

export const muralController = {
  list: (async (_req, res, next) => {
    try {
      res.json(await muralService.list());
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (req, res, next) => {
    try {
      const { title, body, category } = req.body as {
        title: string;
        body: string;
        category?: string;
      };

      const post = await muralService.create({
        title,
        body,
        category,
        authorId: req.user!.id,
      });

      // Notificação push para todos
      pushService
        .sendToAll({
          title: `📢 ${post.title}`,
          body: post.body.length > 100 ? post.body.slice(0, 97) + "…" : post.body,
          url: "/app/comunicados",
        })
        .catch(() => {});

      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  remove: (async (req, res, next) => {
    try {
      await muralService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
