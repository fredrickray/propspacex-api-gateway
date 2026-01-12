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

export {
  UserResponse,
  CreateUserResponse,
  ListUsersResponse,
  SignupResponse,
  SignInResponse,
  VerifyOTPResponse,
  ResendOTPResponse,
};
