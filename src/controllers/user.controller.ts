import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { userService } from "../grpc-clients";
import config from "@config/service.config";
import logger from "@utils/logger";
import {
  SignInResponse,
  SignupResponse,
  VerifyOTPResponse,
  ResendOTPResponse,
  UserResponse,
  ListUsersResponse,
} from "@type/user.types";
import { handleGrpcError } from "@utils/handleGrpcError";

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

export default class UserController {
  async signup(req: Request, res: Response) {
    try {
      const { firstName, lastName, email, password, appRole } = req.body;

      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      const response = (await userService.signup({
        firstName,
        lastName,
        email,
        password,
        appRole: appRole || "buyer",
      })) as SignupResponse;

      if (!response.success) {
        return res.status(400).json({
          success: false,
          message: response.error || "Failed to create account",
        });
      }

      logger.info(
        { email, userId: response.userId },
        "User signed up successfully"
      );

      res.status(201).json({
        success: true,
        message: response.message,
      });
    } catch (error: any) {
      logger.error({ error }, "Signup error");
      handleGrpcError(res, error, "User signup failed", "User");
    }
  }

  async signin(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const response = (await userService.signin({
        email,
        password,
      })) as SignInResponse;

      if (!response.success) {
        return res.status(401).json({
          success: false,
          message: response.error || "Invalid email or password",
        });
      }

      const { user, accessToken, refreshToken } = response;

      logger.info(
        { email, userId: user.userId },
        "User signed in successfully"
      );

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
      handleGrpcError(res, error, "User signin failed", "User");
    }
  }

  async verifyOTP(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required",
        });
      }

      const response = (await userService.verifyOTP({
        email,
        otp,
      })) as VerifyOTPResponse;

      if (!response.success) {
        return res.status(400).json({
          success: false,
          message: response.error || "Invalid or expired OTP",
        });
      }

      logger.info({ email }, "OTP verified successfully");

      res.status(200).json({
        success: true,
        message: response.message,
      });
    } catch (error: any) {
      logger.error({ error }, "Verify OTP error");
      handleGrpcError(res, error, "OTP verification failed", "User");
    }
  }

  async resendOTP(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const response = (await userService.resendOTP({
        email,
      })) as ResendOTPResponse;

      if (!response.success) {
        return res.status(400).json({
          success: false,
          message: response.error || "Failed to resend OTP",
        });
      }

      logger.info({ email }, "OTP resent successfully");

      res.status(200).json({
        success: true,
        message: response.message,
      });
    } catch (error: any) {
      logger.error({ error }, "Resend OTP error");
      handleGrpcError(res, error, "Resend OTP failed", "User");
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      const decoded = jwt.verify(refreshToken, config.jwtSecret) as {
        userId: string;
      };

      const user = (await userService.getUser({
        userId: decoded.userId,
      })) as UserResponse;

      if (!user || !user.isAccountActive) {
        return res.status(401).json({
          success: false,
          message: "Invalid refresh token",
        });
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
  }

  async logout(req: Request, res: Response) {
    // JWT tokens are stateless, so logout is handled client-side
    // For server-side logout, you'd need a token blacklist
    logger.info({ userId: req.user!.userId }, "User logged out");
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  }

  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;

      const user = (await userService.getUser({ userId })) as UserResponse;

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      handleGrpcError(res, error, "Failed to get profile", "User");
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { firstName, lastName, email, phone } = req.body;

      await userService.updateUser({
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
      handleGrpcError(res, error, "Failed to update profile", "User");
    }
  }

  async deleteAccount(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;

      await userService.deleteUser({ userId });

      logger.info({ userId }, "User account deleted");
      res.status(200).json({
        success: true,
        message: "Account deleted successfully",
      });
    } catch (error) {
      handleGrpcError(res, error, "Failed to delete account", "User");
    }
  }

  async listUsers(req: Request, res: Response) {
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
      handleGrpcError(res, error, "Failed to list users", "User");
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = (await userService.getUser({ userId: id })) as UserResponse;

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      handleGrpcError(res, error, "Failed to get user", "User");
    }
  }

  async updateUser(req: Request, res: Response) {
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
      handleGrpcError(res, error, "Failed to update user", "User");
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await userService.deleteUser({ userId: id });

      logger.info({ userId: id }, "User deleted by admin");
      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      handleGrpcError(res, error, "Failed to delete user", "User");
    }
  }
}
