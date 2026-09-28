import { Router } from "express";
import DealController from "@controllers/deal.controller";
import { authenticate } from "@middlewares/auth.middleware";

const router = Router();
const dealController = new DealController();

router.use(authenticate);
router.post("/", dealController.createOrGetDeal.bind(dealController));
router.get("/", dealController.listDeals.bind(dealController));
router.get("/:dealId", dealController.getDeal.bind(dealController));
router.post("/:dealId/quote", dealController.quoteDeal.bind(dealController));
router.post(
  "/:dealId/accept-quote",
  dealController.acceptDealQuote.bind(dealController)
);

export default router;
