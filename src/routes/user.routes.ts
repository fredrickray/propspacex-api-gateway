import { Router } from "express";
import { authenticate, authorizeRoles } from "@middlewares/auth.middleware";
import UserController from "@controllers/user.controller";

const router = Router();
const userController = new UserController();

/**
 * @route   POST /auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post("/signup", userController.signup.bind(userController));

/**
 * @route   POST /auth/signin
 * @desc    Login user
 * @access  Public
 */
router.post("/signin", userController.signin.bind(userController));

/**
 * @route   POST /auth/verify-otp
 * @desc    Verify OTP
 * @access  Public
 */
router.post("/verify-otp", userController.verifyOTP.bind(userController));

/**
 * @route   POST /auth/resend-otp
 * @desc    Resend OTP
 * @access  Public
 */
router.post("/resend-otp", userController.resendOTP.bind(userController));

/**
 * @route   POST /auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post("/refresh-token", userController.refreshToken.bind(userController));


/**
 * @route   POST /auth/request-web3-nonce
 * @desc    Request Web3 nonce
 * @access  Public
 */
router.post("/request-web3-nonce", userController.requestWeb3Nonce.bind(userController));

/**
 * @route   POST /auth/verify-web3-signature
 * @desc    Verify Web3 signature
 * @access  Public
 */
router.post("/verify-web3-signature", userController.verifyWeb3Signature.bind(userController));

/**
 * @route   POST /auth/link-web3-wallet
 * @desc    Link Web3 wallet
 * @access  Private
 */
router.post("/link-web3-wallet", authenticate, userController.linkWeb3Wallet.bind(userController));

/**
 * @route   POST /auth/logout
 * @desc    Logout user (client-side token invalidation)
 * @access  Private
 */
router.post(
  "/logout",
  authenticate,
  userController.logout.bind(userController)
);

/**
 * @route   GET /users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  "/profile",
  authenticate,
  userController.getProfile.bind(userController)
);

/**
 * @route   PUT /users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put(
  "/profile",
  authenticate,
  userController.updateProfile.bind(userController)
);

/**
 * @route   DELETE /users/account
 * @desc    Delete current user account
 * @access  Private
 */
router.delete(
  "/account",
  authenticate,
  userController.deleteAccount.bind(userController)
);

/**
 * @route   GET /users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get(
  "/",
  authenticate,
  authorizeRoles("admin"),
  userController.listUsers.bind(userController)
);

/**
 * @route   GET /users/:id
 * @desc    Get user by ID (admin only)
 * @access  Private/Admin
 */
router.get(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  userController.getUserById.bind(userController)
);

/**
 * @route   PUT /users/:id
 * @desc    Update user (admin only)
 * @access  Private/Admin
 */
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  userController.updateUser.bind(userController)
);

/**
 * @route   DELETE /users/:id
 * @desc    Delete user (admin only)
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  userController.deleteUser.bind(userController)
);

export default router;
