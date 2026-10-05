import { Router } from "express";
import {
    authenticate,
    authorizeRoles,
    optionalAuth,
} from "@middlewares/auth.middleware";
import { propertyUpload } from "@middlewares/upload.middleware";
import PropertyController from "@controllers/property.controller";
import AnalyticsController from "@controllers/analytics.controller";

const agentRouter = Router();
const analyticsController = new AnalyticsController();
const agentPropertyRouter = Router()
const propertyController = new PropertyController();

/**
 * @route   GET /agent/properties
 * @desc    Get all properties
 * @access  Private
 */
agentPropertyRouter.get(
    "/",
    propertyController.getMyProperties.bind(propertyController))


/**
 * @route   POST /agent/properties
 * @desc    Create a new property
 * @access  Private
 */
agentPropertyRouter.post(
    "/",
    authenticate,
    authorizeRoles("agent"),
    propertyUpload,
    propertyController.createProperty.bind(propertyController)
);


/**
 * @route   PUT /agent/properties/:id
 * @desc    Update a property
 * @access  Private
 */
agentPropertyRouter.put(
    "/",
    authenticate,
    authorizeRoles("agent"),
    propertyUpload,
    propertyController.updateProperty.bind(propertyController)
);

/**
 * @route   DELETE /agent/properties/:id
 * @desc    Delete a property
 * @access  Private
 */
agentPropertyRouter.delete(
    "/",
    authenticate,
    authorizeRoles("agent"),
    propertyController.deleteProperty.bind(propertyController))



/**
 * @route   GET /api/v1/agents/analytics
 * @desc    Listing views and deal counts for the signed-in agent
 * @access  Private (agent)
 */
agentRouter.get(
    "/analytics",
    analyticsController.getAgentAnalytics.bind(analyticsController)
);

agentRouter.use("/properties", agentPropertyRouter)

export default agentRouter;

