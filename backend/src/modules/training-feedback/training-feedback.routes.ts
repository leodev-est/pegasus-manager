import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { trainingFeedbackController } from "./training-feedback.controller";

export const trainingFeedbackRoutes = Router();

trainingFeedbackRoutes.use(authMiddleware);

// Athletes submit/update feedback for a training
trainingFeedbackRoutes.post("/", permissionMiddleware("profile:read"), trainingFeedbackController.upsert);

// Get my feedback for a specific training
trainingFeedbackRoutes.get("/:trainingId/mine", permissionMiddleware("profile:read"), trainingFeedbackController.getMyFeedback);

// Staff views all feedback for a training
trainingFeedbackRoutes.get("/:trainingId", permissionMiddleware(["trainings:read"]), trainingFeedbackController.findByTraining);

// Staff or athlete views feedback by athlete
trainingFeedbackRoutes.get("/athlete/:athleteId", permissionMiddleware(["athletes:read", "trainings:read"]), trainingFeedbackController.findByAthlete);
