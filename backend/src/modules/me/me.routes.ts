import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { meController } from "./me.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Apenas imagens são permitidas"));
  },
});

export const meRoutes = Router();

meRoutes.use(authMiddleware);

meRoutes.get("/profile", meController.getProfile);
meRoutes.patch("/profile", meController.updateProfile);
meRoutes.post("/avatar", upload.single("avatar"), meController.uploadAvatar);
meRoutes.get("/payments", meController.getMyPayments);
meRoutes.get("/evaluations", meController.getMyEvaluations);
