import { Request, Response } from "express";
import { propertyService, userService } from "../grpc-clients";
import { handleGrpcError } from "@utils/handleGrpcError";

const documentTitles: Record<string, string> = {
  deedDocument: "Deed document",
  inspectionReport: "Inspection report",
  appraisalReport: "Appraisal report",
};

export default class VerificationController {
  async list(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const [accounts, documents] = await Promise.all([
        userService.listVerifications({ page, limit }),
        propertyService.listPendingDocumentReviews({ page, limit }),
      ]);

      const documentItems = (documents.reviews || []).map((review) => ({
        id: review.id,
        kind: "document",
        status: "pending",
        title: documentTitles[review.documentType] || review.documentType,
        detail: `Property ${review.propertyId}`,
        userId: "",
        email: "",
        propertyId: review.propertyId,
        createdAt: review.createdAt,
      }));

      const verifications = [
        ...(accounts.verifications || []),
        ...documentItems,
      ].sort((left, right) =>
        String(right.createdAt || "").localeCompare(String(left.createdAt || ""))
      );

      res.status(200).json({
        success: true,
        verifications,
        total: Number(accounts.total || 0) + Number(documents.total || 0),
        page,
        limit,
      });
    } catch (error) {
      handleGrpcError(res, error, "Failed to list verifications", "Verification");
    }
  }
}
