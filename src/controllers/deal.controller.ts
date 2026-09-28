import { Request, Response } from "express";
import { userService } from "../grpc-clients";
import { handleGrpcError } from "@utils/handleGrpcError";

export default class DealController {
  async createOrGetDeal(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const { conversationId, propertyTitle } = req.body || {};
      if (!conversationId) {
        return res
          .status(400)
          .json({ success: false, message: "conversationId is required" });
      }

      const response = await userService.createOrGetDeal({
        conversationId: String(conversationId),
        userId,
        propertyTitle: propertyTitle ? String(propertyTitle) : "",
      });

      return res.status(200).json(response);
    } catch (error) {
      return handleGrpcError(res, error, "Failed to create or get deal", "Deal");
    }
  }

  async listDeals(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);

      const response = await userService.listDeals({
        userId,
        page,
        limit,
      });

      return res.status(200).json({ success: true, ...response });
    } catch (error) {
      return handleGrpcError(res, error, "Failed to list deals", "Deal");
    }
  }

  async getDeal(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const dealId = req.params.dealId;
      const response = await userService.getDeal({ dealId, userId });
      return res.status(200).json(response);
    } catch (error) {
      return handleGrpcError(res, error, "Failed to fetch deal", "Deal");
    }
  }

  async quoteDeal(req: Request, res: Response) {
    try {
      const agentId = req.user?.userId;
      if (!agentId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const dealId = req.params.dealId;
      const { amountMinor, platformFeeMinor, quoteNote } = req.body || {};
      if (!amountMinor) {
        return res.status(400).json({ success: false, message: "amountMinor is required" });
      }

      const response = await userService.quoteDeal({
        dealId,
        agentId,
        amountMinor: Number(amountMinor),
        platformFeeMinor: Number(platformFeeMinor || 0),
        quoteNote: quoteNote ? String(quoteNote) : "",
      });

      return res.status(200).json(response);
    } catch (error) {
      return handleGrpcError(res, error, "Failed to quote deal", "Deal");
    }
  }

  async acceptDealQuote(req: Request, res: Response) {
    try {
      const buyerId = req.user?.userId;
      if (!buyerId) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const dealId = req.params.dealId;
      const { idempotencyKey } = req.body || {};
      if (!idempotencyKey) {
        return res
          .status(400)
          .json({ success: false, message: "idempotencyKey is required" });
      }

      const response = await userService.acceptDealQuote({
        dealId,
        buyerId,
        idempotencyKey: String(idempotencyKey),
      });

      return res.status(200).json(response);
    } catch (error) {
      return handleGrpcError(res, error, "Failed to accept quote", "Deal");
    }
  }
}
