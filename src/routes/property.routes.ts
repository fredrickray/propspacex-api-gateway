import { Router } from "express";
import {
  authenticate,
  authorizeRoles,
  optionalAuth,
} from "@middlewares/auth.middleware";
import { propertyUpload } from "@middlewares/upload.middleware";
import PropertyController from "@controllers/property.controller";

const router = Router();
const propertyController = new PropertyController();

/**
 * @route   GET /api/properties
 * @desc    Get all properties with filters
 * @access  Public
 */
router.get(
  "/",
  optionalAuth,
  propertyController.getProperties.bind(propertyController)
);

/**
 * @route   GET /api/properties/search
 * @desc    Search properties
 * @access  Public
 */
router.get(
  "/search",
  propertyController.searchProperties.bind(propertyController)
);

// TODO: Uncomment when GetFeaturedProperties RPC is added to property.proto
// /**
//  * @route   GET /api/properties/featured
//  * @desc    Get featured properties
//  * @access  Public
//  */
// router.get("/featured", propertyController.getFeaturedProperties.bind(propertyController));


/**
 * @route   GET /api/properties/:id
 * @desc    Get single property by ID
 * @access  Public
 */
router.get("/:id", propertyController.getProperty.bind(propertyController));

/**
 * @route   POST /api/v1/properties/:id/views
 * @desc    Record one public listing view
 * @access  Public (owner views are ignored)
 */
router.post(
  "/:id/views",
  optionalAuth,
  propertyController.recordView.bind(propertyController)
);

// TODO: Uncomment when GetPropertyReviews RPC is added to property.proto
// /**
//  * @route   GET /api/properties/:id/reviews
//  * @desc    Get property reviews
//  * @access  Public
//  */
// router.get("/:id/reviews", propertyController.getPropertyReviews.bind(propertyController));

// ==================== Protected Property Routes ====================



/**
 * @route   PUT /api/properties/:id/sold
 * @desc    Mark property as sold
 * @access  Private (Owner, Admin)
 */
// router.put(
//   "/:id/sold",
//   authenticate,
//   propertyController.markAsSold.bind(propertyController)
// );

/**
 * @route   PUT /api/properties/:id/rented
 * @desc    Mark property as rented
 * @access  Private (Owner, Admin)
 */
// router.put(
//   "/:id/rented",
//   authenticate,
//   propertyController.markAsRented.bind(propertyController)
// );

// ==================== Property Images Routes ====================

/**
 * @route   POST /api/properties/:id/images
 * @desc    Add images to property
 * @access  Private (Owner, Admin)
//  */
// router.post(
//   "/:id/images",
//   authenticate,
//   propertyController.addImages.bind(propertyController)
// );

/**
 * @route   DELETE /api/properties/:id/images
 * @desc    Remove image from property
 * @access  Private (Owner, Admin)
 */
// router.delete(
//   "/:id/images",
//   authenticate,
//   propertyController.removeImage.bind(propertyController)
// );

// TODO: Uncomment Favorites routes when RPCs are added to property.proto
// // ==================== Favorites Routes ====================
//
// /**
//  * @route   POST /api/properties/:id/favorite
//  * @desc    Add property to favorites
//  * @access  Private
//  */
// router.post("/:id/favorite", authenticate, propertyController.addToFavorites.bind(propertyController));
//
// /**
//  * @route   DELETE /api/properties/:id/favorite
//  * @desc    Remove property from favorites
//  * @access  Private
//  */
// router.delete("/:id/favorite", authenticate, propertyController.removeFromFavorites.bind(propertyController));
//
// /**
//  * @route   GET /api/properties/favorites/me
//  * @desc    Get user's favorite properties
//  * @access  Private
//  */
// router.get("/favorites/me", authenticate, propertyController.getMyFavorites.bind(propertyController));

// TODO: Uncomment Reviews routes when RPCs are added to property.proto
// // ==================== Reviews Routes ====================
//
// /**
//  * @route   POST /api/properties/:id/reviews
//  * @desc    Add a review to property
//  * @access  Private
//  */
// router.post("/:id/reviews", authenticate, propertyController.addReview.bind(propertyController));

export default router;
