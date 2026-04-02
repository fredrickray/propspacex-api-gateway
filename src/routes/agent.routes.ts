import { Router } from "express";
import {
    authenticate,
    authorizeRoles,
    optionalAuth,
} from "@middlewares/auth.middleware";
import { propertyUpload } from "@middlewares/upload.middleware";
import PropertyController from "@controllers/property.controller";

const agentRouter = Router();
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



agentRouter.use("/properties", agentPropertyRouter)

export default agentRouter;

