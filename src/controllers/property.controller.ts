import { Request, Response, NextFunction } from "express";
import { propertyService } from "../grpc-clients";
import logger from "@utils/logger";
import { handleGrpcError } from "@utils/handleGrpcError";
import { mediaService } from "@grpc-clients/media.client";
import { entityType } from "@type/media.types";

export default class PropertyController {
  async getProperties(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        sort,
        type,
        status,
        minPrice,
        maxPrice,
        city,
        country,
        bedrooms,
        bathrooms,
        ownerId,
        isActive,
        search,
        flagged,
      } = req.query;

      const requestParams = {
        page: Number(page),
        limit: Number(limit),
        sort: sort as string,
        type: type as string,
        status: status as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        city: city as string,
        country: country as string,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
        ownerId: ownerId as string,
        isActive: isActive !== undefined ? isActive === "true" : undefined,
        filterByActive: isActive !== undefined ? true : undefined,
        search: search as string,
        callerRole: req.user?.appRole,
        ...(flagged !== undefined
          ? {
              flagged: flagged === "true",
              filterByFlagged: true,
            }
          : {}),
      };

      logger.info({ requestParams }, "ListProperties request params");

      const response = await propertyService.getProperties(requestParams);

      logger.info({ response }, "ListProperties response from gRPC");

      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error, "Failed to get properties", "Property");
    }
  }

  async searchProperties(req: Request, res: Response) {
    try {
      const {
        query,
        type,
        listingType,
        minPrice,
        maxPrice,
        minBedrooms,
        maxBedrooms,
        city,
        country,
        page = 1,
        limit = 10,
      } = req.query;

      const response = await propertyService.searchProperties({
        query: query as string,
        type: type as string,
        listingType: listingType as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        bedrooms: minBedrooms ? Number(minBedrooms) : undefined,
        bathrooms: maxBedrooms ? Number(maxBedrooms) : undefined,
        city: city as string,
        country: country as string,
        page: Number(page),
        limit: Number(limit),
      });

      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error, "Failed to search properties", "Property");
    }
  }

  async getProperty(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const response = await propertyService.getProperty({ propertyId: id });

      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error, "Failed to get property", "Property");
    }
  }

  //   async createProperty(req: Request, res: Response) {
  //     try {
  //       const ownerId = req.user!.userId;
  //       const files = req.files as {
  //         [fieldname: string]: Express.Multer.File[];
  //       };
  //       const {
  //         title,
  //         description,
  //         type,
  //         status,
  //         price,
  //         currency,
  //         location,
  //         features,
  //         size,
  //         amenities,
  //         media,
  //       } = req.body;

  //       const response = await propertyService.createProperty({
  //         title,
  //         description,
  //         type,
  //         status,
  //         price,
  //         currency,
  //         location,
  //         features,
  //         size,
  //         amenities,
  //         media,
  //         ownerId,
  //       });

  //       logger.info(
  //         { ownerId, propertyId: (response as any).property?.id },
  //         "Property created"
  //       );
  //       res.status(201).json(response);
  //     } catch (error) {
  //       handleGrpcError(res, error, "Failed to create property", "Property");
  //     }
  //   }

  async createProperty(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId || (req.headers["x-user-id"] as string);
      console.log("User ID from headers:", req.headers["x-user-id"]);

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "User ID required" });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      console.log("Uploaded files:", Object.keys(files || {}));

      // Parse property data - support both individual fields and single propertyData JSON
      let propertyData: Record<string, any>;
      if (req.body.propertyData) {
        propertyData = JSON.parse(req.body.propertyData);
      } else {
        // Parse individual form fields
        const parseJsonField = (field: any) => {
          if (typeof field === "string") {
            try {
              return JSON.parse(field);
            } catch {
              return field;
            }
          }
          return field;
        };

        propertyData = {
          title: req.body.title,
          description: req.body.description,
          type: req.body.type,
          status: req.body.status,
          price: req.body.price ? Number(req.body.price) : undefined,
          currency: req.body.currency,
          location: parseJsonField(req.body.location),
          features: parseJsonField(req.body.features),
          size: parseJsonField(req.body.size),
          amenities: parseJsonField(req.body.amenities),
        };
      }
      console.log("Property data:", propertyData);

      // Temporary ID for uploads (will be updated after property creation)
      const tempEntityId = `pending_${Date.now()}`;
      console.log("Temporary Entity ID:", tempEntityId);

      // Step 1: Upload images to Media Service
      let uploadedImages: Array<{ url: string; mediaId: string }> = [];
      if (files?.images && files.images.length > 0) {
        console.log("Uploading images to Media Service...");
        const imageResults = await mediaService.uploadMultipleFiles(
          files.images.map((f) => ({
            buffer: f.buffer,
            filename: f.originalname,
            mimeType: f.mimetype,
          })),
          {
            entityType: entityType.PROPERTY,
            entityId: tempEntityId,
            fieldName: "images",
            uploadedBy: userId,
          }
        );
        uploadedImages = imageResults.map((m) => ({
          url: m.url,
          mediaId: m.id,
        }));

        console.log("Uploaded images:", uploadedImages);
      }

      // Step 2: Upload videos to Media Service
      let uploadedVideos: Array<{ url: string; mediaId: string }> = [];
      if (files?.videos && files.videos.length > 0) {
        console.log("Uploading videos to Media Service...");
        const videoResults = await mediaService.uploadMultipleFiles(
          files.videos.map((f) => ({
            buffer: f.buffer,
            filename: f.originalname,
            mimeType: f.mimetype,
          })),
          {
            entityType: entityType.PROPERTY,
            entityId: tempEntityId,
            fieldName: "videos",
            uploadedBy: userId,
          }
        );
        uploadedVideos = videoResults.map((m) => ({
          url: m.url,
          mediaId: m.id,
        }));

        console.log("Uploaded videos:", uploadedVideos);
      }

      // Step 3: Upload documents to Media Service
      let deedDocument: { url: string; mediaId: string } | null = null;
      let inspectionReport: { url: string; mediaId: string } | null = null;
      let appraisalReport: { url: string; mediaId: string } | null = null;

      if (files?.deedDocument?.[0]) {
        console.log("Uploading deed document to Media Service...");
        const result = await mediaService.uploadFile(
          files.deedDocument[0].buffer,
          files.deedDocument[0].originalname,
          files.deedDocument[0].mimetype,
          {
            entityType: entityType.PROPERTY,
            entityId: tempEntityId,
            fieldName: "deedDocument",
            uploadedBy: userId,
          }
        );
        deedDocument = { url: result.url, mediaId: result.id };
        console.log("Uploaded deed document:", deedDocument);
      }

      if (files?.inspectionReport?.[0]) {
        console.log("Uploading inspection report to Media Service...");
        const result = await mediaService.uploadFile(
          files.inspectionReport[0].buffer,
          files.inspectionReport[0].originalname,
          files.inspectionReport[0].mimetype,
          {
            entityType: entityType.PROPERTY,
            entityId: tempEntityId,
            fieldName: "inspectionReport",
            uploadedBy: userId,
          }
        );
        inspectionReport = { url: result.url, mediaId: result.id };
        console.log("Uploaded inspection report:", inspectionReport);
      }

      if (files?.appraisalReport?.[0]) {
        console.log("Uploading appraisal report to Media Service...");
        const result = await mediaService.uploadFile(
          files.appraisalReport[0].buffer,
          files.appraisalReport[0].originalname,
          files.appraisalReport[0].mimetype,
          {
            entityType: entityType.PROPERTY,
            entityId: tempEntityId,
            fieldName: "appraisalReport",
            uploadedBy: userId,
          }
        );
        appraisalReport = { url: result.url, mediaId: result.id };
        console.log("Uploaded appraisal report:", appraisalReport);
      }

      // Step 4: Create property via gRPC to Property Service
      const createPropertyPayload = {
        title: propertyData.title,
        description: propertyData.description,
        type: propertyData.type,
        status: propertyData.status,
        price: propertyData.price,
        currency: propertyData.currency,
        location: propertyData.location,
        features: propertyData.features,
        size: propertyData.size,
        amenities: propertyData.amenities,
        ownerId: userId,
        media: {
          images: uploadedImages,
          videos: uploadedVideos,
        },
      };

      const propertyResponse = await propertyService.createProperty(
        createPropertyPayload
      );

      console.log("Created property:", propertyResponse.property);

      if (!propertyResponse.success) {
        throw new Error(
          propertyResponse.message || "Failed to create property"
        );
      }

      const propertyId = propertyResponse.property.id;

      // Step 5: Create property documents if deed exists
      let documentsResponse = null;
      if (deedDocument) {
        documentsResponse = await propertyService.createPropertyDocuments({
          propertyId,
          deedDocument,
          inspectionReport: inspectionReport || undefined,
          appraisalReport: appraisalReport || undefined,
        });

        console.log("Created property documents:", documentsResponse);
      }

      // Step 6: (Optional) Update media entityId with actual property ID
      // This can be done in background or via a message queue
      const allMediaIds = [
        ...uploadedImages.map((i) => i.mediaId),
        ...uploadedVideos.map((v) => v.mediaId),
        deedDocument?.mediaId,
        inspectionReport?.mediaId,
        appraisalReport?.mediaId,
      ].filter(Boolean) as string[];

      // Fire and forget - update entityId in media service
      Promise.all(
        allMediaIds.map((mediaId) =>
          mediaService
            .updateMedia(mediaId, { isActive: true })
            .catch(console.error)
        )
      );

      res.status(201).json({
        success: true,
        message: "Property created successfully",
        data: {
          property: propertyResponse.property,
          documents: documentsResponse?.document || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProperty(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        type,
        price,
        currency,
        location,
        features,
        amenities,
        media,
      } = req.body;

      const response = await propertyService.updateProperty({
        propertyId: id,
        title,
        description,
        type,
        price,
        currency,
        location,
        features,
        amenities,
        media,
      });

      logger.info({ propertyId: id }, "Property updated");
      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error, "Failed to update property", "Property");
    }
  }

  async deleteProperty(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const ownerId = req.user!.userId;

      const response = await propertyService.deleteProperty({
        propertyId: id,
        userId: ownerId,
      });

      logger.info({ propertyId: id }, "Property deleted");
      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error, "Failed to delete property", "Property");
    }
  }

  async getMyProperties(req: Request, res: Response) {
    try {
      const ownerId = req.user!.userId;
      const {
        page = 1,
        limit = 10,
        sort,
        type,
        status,
        minPrice,
        maxPrice,
        city,
        country,
        bedrooms,
        bathrooms,
        isActive,
        search,
      } = req.query;

      const requestParams = {
        page: Number(page),
        limit: Number(limit),
        sort: sort as string,
        type: type as string,
        status: status as string,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        city: city as string,
        country: country as string,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
        ownerId: ownerId, // Hardcode ownerId to the authenticated user and ignore query payload ownerId.
        isActive: isActive !== undefined ? isActive === "true" : undefined,
        filterByActive: isActive !== undefined ? true : undefined,
        search: search as string,
        callerRole: req.user?.appRole,
        includeInactive: true,
      };

      const response = await propertyService.getProperties(requestParams);

      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error, "Failed to get your properties", "Property");
    }
  }

  async approveProperty(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const response = await propertyService.approveProperty({
        propertyId: id,
        adminId: req.user!.userId,
      });

      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error, "Failed to approve listing", "Property");
    }
  }

  async rejectProperty(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const response = await propertyService.rejectProperty({
        propertyId: id,
        adminId: req.user!.userId,
        reason: req.body?.reason,
      });

      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error, "Failed to reject listing", "Property");
    }
  }

  async escalateProperty(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const response = await propertyService.escalateProperty({
        propertyId: id,
        adminId: req.user!.userId,
        note: req.body?.note,
      });

      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error, "Failed to escalate listing", "Property");
    }
  }

  async updatePropertyStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const response = await propertyService.updatePropertyStatus({
        propertyId: id,
        status,
      });

      logger.info({ propertyId: id, status }, "Property status updated");
      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(
        res,
        error,
        "Failed to update property status",
        "Property"
      );
    }
  }

  //   async markAsSold(req: Request, res: Response) {
  //     try {
  //       const { id } = req.params;

  //       const response = await propertyService.markAsSold({ propertyId: id });

  //       logger.info({ propertyId: id }, "Property marked as sold");
  //       res.status(200).json(response);
  //     } catch (error) {
  //       handleGrpcError(
  //         res,
  //         error,
  //         "Failed to mark property as sold",
  //         "Property"
  //       );
  //     }
  //   }

  //   async markAsRented(req: Request, res: Response) {
  //     try {
  //       const { id } = req.params;

  //       const response = await propertyService.markAsRented({ propertyId: id });

  //       logger.info({ propertyId: id }, "Property marked as rented");
  //       res.status(200).json(response);
  //     } catch (error) {
  //       handleGrpcError(
  //         res,
  //         error,
  //         "Failed to mark property as rented",
  //         "Property"
  //       );
  //     }
  //   }

  // ==================== Property Images Routes ====================

  //   async addImages(req: Request, res: Response) {
  //     try {
  //       const { id } = req.params;
  //       const { images } = req.body;

  //       const response = await propertyService.addPropertyImages({
  //         propertyId: id,
  //         images,
  //       });

  //       logger.info({ propertyId: id }, "Images added to property");
  //       res.status(200).json(response);
  //     } catch (error) {
  //       handleGrpcError(res, error, "Failed to add images", "Property");
  //     }
  //   }

  //   async removeImage(req: Request, res: Response) {
  //     try {
  //       const { id } = req.params;
  //       const { imageUrl } = req.body;

  //       const response = await propertyService.removePropertyImage({
  //         propertyId: id,
  //         imageUrl,
  //       });

  //       logger.info({ propertyId: id }, "Image removed from property");
  //       res.status(200).json(response);
  //     } catch (error) {
  //       handleGrpcError(res, error, "Failed to remove image", "Property");
  //     }
  //   }

  // TODO: Uncomment when RPCs are added to property.proto
  // // ==================== Favorites Routes ====================
  // async addToFavorites(req: Request, res: Response) { ... }
  // async removeFromFavorites(req: Request, res: Response) { ... }
  // async getMyFavorites(req: Request, res: Response) { ... }
  // // ==================== Reviews Routes ====================
  // async addReview(req: Request, res: Response) { ... }
  // async getPropertyReviews(req: Request, res: Response) { ... }
}
