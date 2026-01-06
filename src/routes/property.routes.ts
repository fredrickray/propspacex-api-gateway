import { Router, Request, Response } from "express";
import { propertyService } from "../grpc-clients";
import {
  authenticate,
  authorizeRoles,
  optionalAuth,
} from "@middlewares/auth.middleware";
import logger from "@utils/logger";

const router = Router();

// Helper to handle gRPC errors
const handleGrpcError = (res: Response, error: any) => {
  logger.error({ error }, "Property service error");

  const statusCode = error.code === 14 ? 503 : error.code === 5 ? 404 : 500;
  const message =
    error.code === 14
      ? "Property service unavailable"
      : error.details || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
  });
};

// ==================== Public Property Routes ====================

/**
 * @route   GET /api/properties
 * @desc    Get all properties with filters
 * @access  Public
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      listingType,
      status,
      city,
      state,
    } = req.query;

    const response = await propertyService.getProperties({
      page: Number(page),
      limit: Number(limit),
      type: type as string,
      listingType: listingType as string,
      status: status as string,
      city: city as string,
      state: state as string,
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error);
  }
});

/**
 * @route   GET /api/properties/search
 * @desc    Search properties
 * @access  Public
 */
router.get("/search", async (req: Request, res: Response) => {
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
      state,
      page = 1,
      limit = 10,
    } = req.query;

    const response = await propertyService.searchProperties({
      query: query as string,
      type: type as string,
      listingType: listingType as string,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minBedrooms: minBedrooms ? Number(minBedrooms) : undefined,
      maxBedrooms: maxBedrooms ? Number(maxBedrooms) : undefined,
      city: city as string,
      state: state as string,
      page: Number(page),
      limit: Number(limit),
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error);
  }
});

/**
 * @route   GET /api/properties/featured
 * @desc    Get featured properties
 * @access  Public
 */
router.get("/featured", async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const response = await propertyService.getFeaturedProperties({
      limit: Number(limit),
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error);
  }
});

/**
 * @route   GET /api/properties/:id
 * @desc    Get single property by ID
 * @access  Public
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const response = await propertyService.getProperty({ propertyId: id });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error);
  }
});

/**
 * @route   GET /api/properties/:id/reviews
 * @desc    Get property reviews
 * @access  Public
 */
router.get("/:id/reviews", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const response = await propertyService.getPropertyReviews({
      propertyId: id,
      page: Number(page),
      limit: Number(limit),
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error);
  }
});

// ==================== Protected Property Routes ====================

/**
 * @route   POST /api/properties
 * @desc    Create a new property
 * @access  Private (Agent, Landlord, Admin)
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("agent", "landlord", "admin"),
  async (req: Request, res: Response) => {
    try {
      const ownerId = req.user!.userId;
      const {
        title,
        description,
        type,
        listingType,
        price,
        currency,
        address,
        features,
        images,
      } = req.body;

      const response = await propertyService.createProperty({
        title,
        description,
        type,
        listingType,
        price,
        currency,
        address,
        features,
        images,
        ownerId,
      });

      logger.info(
        { ownerId, propertyId: (response as any).property?.id },
        "Property created"
      );
      res.status(201).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

/**
 * @route   PUT /api/properties/:id
 * @desc    Update a property
 * @access  Private (Owner, Admin)
 */
router.put("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      type,
      listingType,
      price,
      currency,
      address,
      features,
    } = req.body;

    const response = await propertyService.updateProperty({
      propertyId: id,
      title,
      description,
      type,
      listingType,
      price,
      currency,
      address,
      features,
    });

    logger.info({ propertyId: id }, "Property updated");
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error);
  }
});

/**
 * @route   DELETE /api/properties/:id
 * @desc    Delete a property
 * @access  Private (Owner, Admin)
 */
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ownerId = req.user!.userId;

    const response = await propertyService.deleteProperty({
      propertyId: id,
      ownerId,
    });

    logger.info({ propertyId: id }, "Property deleted");
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error);
  }
});

/**
 * @route   GET /api/properties/owner/me
 * @desc    Get current user's properties
 * @access  Private
 */
router.get("/owner/me", authenticate, async (req: Request, res: Response) => {
  try {
    const ownerId = req.user!.userId;
    const { page = 1, limit = 10 } = req.query;

    const response = await propertyService.getPropertiesByOwner({
      ownerId,
      page: Number(page),
      limit: Number(limit),
    });

    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error);
  }
});

/**
 * @route   PUT /api/properties/:id/status
 * @desc    Update property status
 * @access  Private (Owner, Admin)
 */
router.put("/:id/status", authenticate, async (req: Request, res: Response) => {
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
    handleGrpcError(res, error);
  }
});

/**
 * @route   PUT /api/properties/:id/sold
 * @desc    Mark property as sold
 * @access  Private (Owner, Admin)
 */
router.put("/:id/sold", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const response = await propertyService.markAsSold({ propertyId: id });

    logger.info({ propertyId: id }, "Property marked as sold");
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error);
  }
});

/**
 * @route   PUT /api/properties/:id/rented
 * @desc    Mark property as rented
 * @access  Private (Owner, Admin)
 */
router.put("/:id/rented", authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const response = await propertyService.markAsRented({ propertyId: id });

    logger.info({ propertyId: id }, "Property marked as rented");
    res.status(200).json(response);
  } catch (error) {
    handleGrpcError(res, error);
  }
});

// ==================== Property Images Routes ====================

/**
 * @route   POST /api/properties/:id/images
 * @desc    Add images to property
 * @access  Private (Owner, Admin)
 */
router.post(
  "/:id/images",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { images } = req.body;

      const response = await propertyService.addPropertyImages({
        propertyId: id,
        images,
      });

      logger.info({ propertyId: id }, "Images added to property");
      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

/**
 * @route   DELETE /api/properties/:id/images
 * @desc    Remove image from property
 * @access  Private (Owner, Admin)
 */
router.delete(
  "/:id/images",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { imageUrl } = req.body;

      const response = await propertyService.removePropertyImage({
        propertyId: id,
        imageUrl,
      });

      logger.info({ propertyId: id }, "Image removed from property");
      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

// ==================== Favorites Routes ====================

/**
 * @route   POST /api/properties/:id/favorite
 * @desc    Add property to favorites
 * @access  Private
 */
router.post(
  "/:id/favorite",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const response = await propertyService.addToFavorites({
        userId,
        propertyId: id,
      });

      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

/**
 * @route   DELETE /api/properties/:id/favorite
 * @desc    Remove property from favorites
 * @access  Private
 */
router.delete(
  "/:id/favorite",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const response = await propertyService.removeFromFavorites({
        userId,
        propertyId: id,
      });

      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

/**
 * @route   GET /api/properties/favorites/me
 * @desc    Get user's favorite properties
 * @access  Private
 */
router.get(
  "/favorites/me",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { page = 1, limit = 10 } = req.query;

      const response = await propertyService.getUserFavorites({
        userId,
        page: Number(page),
        limit: Number(limit),
      });

      res.status(200).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

// ==================== Reviews Routes ====================

/**
 * @route   POST /api/properties/:id/reviews
 * @desc    Add a review to property
 * @access  Private
 */
router.post(
  "/:id/reviews",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const { rating, comment } = req.body;

      const response = await propertyService.addPropertyReview({
        propertyId: id,
        userId,
        rating,
        comment,
      });

      logger.info({ propertyId: id, userId }, "Review added to property");
      res.status(201).json(response);
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

export default router;
