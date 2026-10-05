import { Router } from "express";
import VerificationController from "@controllers/verification.controller";

const router = Router();
const verificationController = new VerificationController();

router.get("/", verificationController.list.bind(verificationController));

export default router;
