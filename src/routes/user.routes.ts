import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { userService } from "../grpc-clients";
import { authenticate, authorize } from "@middlewares/auth.middleware";
import config from "@config/service.config";
import logger from "@utils/logger";

const router = Router();

// Response type from user microservice
interface UserResponse {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isVerified: boolean;
  isAccountActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateUserResponse {
  success: boolean;
  userId: string;
}

interface ListUsersResponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
}

// Signin response from microservice
interface SignupResponse {
  success: boolean;
  userId: string;
  message: string;
  error: string;
}

interface SignInResponse {
  success: boolean;
  user: UserResponse;
  error: string;
  accessToken: string;
  refreshToken: string;
}

interface VerifyOTPResponse {
  success: boolean;
  message: string;
  error: string;
}

interface ResendOTPResponse {
  success: boolean;
  message: string;
  error: string;
}

// Helper to handle gRPC errors
const handleGrpcError = (res: Response, error: any) => {
  logger.error({ error }, "User service error");

  const statusCode = error.code === 14 ? 503 : error.code === 5 ? 404 : 500;
  const message =
    error.code === 14
      ? "User service unavailable"
      : error.details || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
  });
};

// Helper to generate JWT tokens
const generateTokens = (user: UserResponse) => {
  const accessToken = jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      role: "buyer",
    },
    config.jwtSecret,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign({ userId: user.userId }, config.jwtSecret, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

// ==================== Authentication Routes ====================

/**
 * @route   POST /auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, appRole } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({
        success: false,
        message: "All fields are required",
      });
      return;
    }

    const response = (await userService.signup({
      firstName,
      lastName,
      email,
      password,
      appRole: appRole || "buyer",
    })) as SignupResponse;

    if (!response.success) {
      res.status(400).json({
        success: false,
        message: response.error || "Failed to create account",
      });
      return;
    }

    logger.info(
      { email, userId: response.userId },
      "User signed up successfully"
    );

    res.status(201).json({
      success: true,
      message: response.message,
      // userId: response.userId,
    });
  } catch (error: any) {
    logger.error({ error }, "Signup error");
    handleGrpcError(res, error);
  }
});

/**
 * @route   POST /auth/signin
 * @desc    Login user
 * @access  Public
 */
router.post("/signin", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    // Call microservice's Signin - handles password verification & token generation
    const response = (await userService.signin({
      email,
      password,
    })) as SignInResponse;

    // Check if signin was successful
    if (!response.success) {
      res.status(401).json({
        success: false,
        message: response.error || "Invalid email or password",
      });
      return;
    }

    const { user, accessToken, refreshToken } = response;

    logger.info({ email, userId: user.userId }, "User signed in successfully");

    res.status(200).json({
      success: true,
      message: "Signed in successfully",
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isVerified: user.isVerified,
      },
    });
  } catch (error: any) {
    logger.error({ error }, "Signin error");
    handleGrpcError(res, error);
  }
});

router.post("/verify-otp", async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
      return;
    }

    const response = (await userService.verifyOTP({
      email,
      otp,
    })) as VerifyOTPResponse;

    if (!response.success) {
      res.status(400).json({
        success: false,
        message: response.error || "Invalid or expired OTP",
      });
      return;
    }

    logger.info({ email }, "OTP verified successfully");

    res.status(200).json({
      success: true,
      message: response.message,
    });
  } catch (error: any) {
    logger.error({ error }, "Verify OTP error");
    handleGrpcError(res, error);
  }
});

// POST /api/auth/resend-otp
router.post("/resend-otp", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    const response = (await userService.resendOTP({
      email,
    })) as ResendOTPResponse;

    if (!response.success) {
      res.status(400).json({
        success: false,
        message: response.error || "Failed to resend OTP",
      });
      return;
    }

    logger.info({ email }, "OTP resent successfully");

    res.status(200).json({
      success: true,
      message: response.message,
    });
  } catch (error: any) {
    logger.error({ error }, "Resend OTP error");
    handleGrpcError(res, error);
  }
});

/**
 * @route   POST /auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post("/refresh-token", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
      return;
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwtSecret) as {
      userId: string;
    };

    // Fetch user to ensure they still exist
    const user = (await userService.getUser({
      userId: decoded.userId,
    })) as UserResponse;

    if (!user || !user.isAccountActive) {
      res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
      return;
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    res.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
});

/**
 * @route   POST /auth/logout
 * @desc    Logout user (client-side token invalidation)
 * @access  Private
 */
router.post("/logout", authenticate, async (req: Request, res: Response) => {
  // JWT tokens are stateless, so logout is handled client-side
  // For server-side logout, you'd need a token blacklist
  logger.info({ userId: req.user!.userId }, "User logged out");
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// ==================== User Profile Routes ====================

/**
 * @route   GET /users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/profile", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = (await userService.getUser({ userId })) as UserResponse;

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    handleGrpcError(res, error);
  }
});

/**
 * @route   PUT /users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put("/profile", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { firstName, lastName, email, phone } = req.body;

    const response = await userService.updateUser({
      userId,
      firstName,
      lastName,
      email,
      phone,
    });

    logger.info({ userId }, "User profile updated");
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    handleGrpcError(res, error);
  }
});

/**
 * @route   DELETE /users/account
 * @desc    Delete current user account
 * @access  Private
 */
router.delete("/account", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    await userService.deleteUser({ userId });

    logger.info({ userId }, "User account deleted");
    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    handleGrpcError(res, error);
  }
});

// ==================== Admin User Management Routes ====================

/**
 * @route   GET /users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get(
  "/",
  authenticate,
  authorize("admin"),
  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, search } = req.query;

      const response = (await userService.listUsers({
        page: Number(page),
        limit: Number(limit),
        search: (search as string) || "",
      })) as ListUsersResponse;

      res.status(200).json({
        success: true,
        users: response.users,
        total: response.total,
        page: response.page,
        limit: response.limit,
      });
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

/**
 * @route   GET /users/:id
 * @desc    Get user by ID (admin only)
 * @access  Private/Admin
 */
router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const user = (await userService.getUser({ userId: id })) as UserResponse;

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

/**
 * @route   PUT /users/:id
 * @desc    Update user (admin only)
 * @access  Private/Admin
 */
router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, phone } = req.body;

      await userService.updateUser({
        userId: id,
        firstName,
        lastName,
        email,
        phone,
      });

      logger.info({ userId: id }, "User updated by admin");
      res.status(200).json({
        success: true,
        message: "User updated successfully",
      });
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

/**
 * @route   DELETE /users/:id
 * @desc    Delete user (admin only)
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await userService.deleteUser({ userId: id });

      logger.info({ userId: id }, "User deleted by admin");
      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      handleGrpcError(res, error);
    }
  }
);

export default router;
