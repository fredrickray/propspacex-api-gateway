import { Router } from "express";
import PropertyController from "@controllers/property.controller";

const router = Router();
const propertyController = new PropertyController();

router.post(
  "/:id/approve",
  propertyController.approveProperty.bind(propertyController)
);
router.post(
  "/:id/reject",
  propertyController.rejectProperty.bind(propertyController)
);
router.post(
  "/:id/escalate",
  propertyController.escalateProperty.bind(propertyController)
);

export default router;
