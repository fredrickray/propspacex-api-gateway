import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import config from "@config/service.config";
import logger from "@utils/logger";

const protoLoaderOptions: protoLoader.Options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

export interface SigninRequest {
  email: string;
  password: string;
}

export interface SigninResponse {
  success: boolean;
  user: UserResponse | null;
  error: string;
  accessToken: string;
  refreshToken: string;
}

export interface SignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  appRole?: string;
}

export interface SignupResponse {
  success: boolean;
  userId: string;
  message: string;
  error: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  error: string;
}

export interface ResendOTPRequest {
  email: string;
}

export interface ResendOTPResponse {
  success: boolean;
  message: string;
  error: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  error: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  error: string;
}

export interface RequestWeb3NonceRequest {
  walletAddress: string;
  appRole?: string;
}

export interface RequestWeb3NonceResponse {
  success: boolean;
  nonce: string;
  message: string;
  error: string;
}

export interface VerifyWeb3SignatureRequest {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface VerifyWeb3SignatureResponse {
  success: boolean;
  user: UserResponse | null;
  error: string;
  accessToken: string;
  refreshToken: string;
}

export interface LinkWeb3WalletRequest {
  userId: string;
  walletAddress: string;
}

export interface LinkWeb3WalletResponse {
  success: boolean;
  message: string;
  isPrimary: boolean;
  error: string;
}

export interface UserResponse {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isVerified: boolean;
  isAccountActive: boolean;
  appRole: string;
  lastLoginDate: { seconds: string; nanos: number } | null;
  loginAttempts: number;
  allowedLoginAttempts: number;
  loginCooldown: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetUserRequest {
  userId: string;
}

export interface GetUserEmailRequest {
  email: string;
}

export interface ListUsersRequest {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ListUsersResponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}

export interface CreateUserResponse {
  success: boolean;
  userId: string;
}

export interface UpdateUserRequest {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface UpdateUserResponse {
  success: boolean;
}

export interface DeleteUserRequest {
  userId: string;
}

export interface DeleteUserResponse {
  success: boolean;
}

// Security & Device Types
export interface ValidateTokenRequest {
  accessToken: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  userId: string;
  email: string;
  appRole: string;
  isVerified: boolean;
  isAccountActive: boolean;
  error: string;
}

export interface RegisterDeviceRequest {
  userId: string;
  ipAddress: string;
  userAgent: string;
  isTrusted?: boolean;
}

export interface RegisterDeviceResponse {
  success: boolean;
  deviceId: string;
  isNewDevice: boolean;
  isSuspicious: boolean;
}

export interface LogActivityRequest {
  event: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  metadata?: string;
}

export interface LogActivityResponse {
  success: boolean;
}

export interface CheckDeviceTrustRequest {
  userId: string;
  deviceId: string;
}

export interface CheckDeviceTrustResponse {
  isTrusted: boolean;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  error: string;
}

export interface DealResponse {
  success: boolean;
  deal?: {
    dealId: string;
    conversationId: string;
    propertyId: string;
    propertyTitle: string;
    buyerId: string;
    buyerName: string;
    agentId: string;
    agentName: string;
    status: string;
    quotedAmountMinor: number;
    platformFeeMinor: number;
    quoteNote: string;
    escrowId: string;
    createdAt: string;
    updatedAt: string;
    quotedAt: string;
    acceptedAt: string;
  };
  error: string;
}

export interface ListDealsResponse {
  deals: DealResponse["deal"][];
  total: number;
  page: number;
  limit: number;
}

export class UserServiceClient {
  private client: any;
  private connected: boolean = false;

  /**
   * Create a new User Service client
   * @param address - gRPC server address (e.g., 'localhost:50051' or 'user-service:50051')
   * @param protoPath - Optional custom path to user.proto file
   */
  constructor(private address: string, protoPath?: string) {
    const PROTO_PATH =
      protoPath || path.join(__dirname, "../../proto/user/v1/user.proto");
    const packageDefinition = protoLoader.loadSync(
      PROTO_PATH,
      protoLoaderOptions
    );
    const userProto = grpc.loadPackageDefinition(packageDefinition) as any;

    this.client = new userProto.user.UserService(
      address,
      grpc.credentials.createInsecure()
    );

    logger.info({ address }, "User gRPC client initialized");
  }

  private promisify<T>(
    method: string,
    params: Record<string, any>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.client[method](
        params,
        (error: grpc.ServiceError | null, response: T) => {
          if (error) {
            logger.error({ error, method }, "gRPC call failed");
            reject(error);
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  async signin(params: SigninRequest): Promise<SigninResponse> {
    return this.promisify<SigninResponse>("Signin", params);
  }

  async signup(params: SignupRequest): Promise<SignupResponse> {
    return this.promisify<SignupResponse>("Signup", params);
  }

  async verifyOTP(params: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    return this.promisify<VerifyOTPResponse>("VerifyOTP", params);
  }

  async resendOTP(params: ResendOTPRequest): Promise<ResendOTPResponse> {
    return this.promisify<ResendOTPResponse>("ResendOTP", params);
  }

  async forgotPassword(
    params: ForgotPasswordRequest
  ): Promise<ForgotPasswordResponse> {
    return this.promisify<ForgotPasswordResponse>("ForgotPassword", params);
  }

  async resetPassword(
    params: ResetPasswordRequest
  ): Promise<ResetPasswordResponse> {
    return this.promisify<ResetPasswordResponse>("ResetPassword", params);
  }

  async requestWeb3Nonce(params: RequestWeb3NonceRequest): Promise<RequestWeb3NonceResponse> {
    return this.promisify<RequestWeb3NonceResponse>("RequestWeb3Nonce", params);
  }

  async verifyWeb3Signature(params: VerifyWeb3SignatureRequest): Promise<VerifyWeb3SignatureResponse> {
    return this.promisify<VerifyWeb3SignatureResponse>("VerifyWeb3Signature", params);
  }

  async linkWeb3Wallet(params: LinkWeb3WalletRequest): Promise<LinkWeb3WalletResponse> {
    return this.promisify<LinkWeb3WalletResponse>("LinkWeb3Wallet", params);
  }

  async createUser(params: CreateUserRequest): Promise<CreateUserResponse> {
    return this.promisify<CreateUserResponse>("CreateUser", params);
  }

  async getUser(params: GetUserRequest): Promise<UserResponse> {
    return this.promisify<UserResponse>("GetUser", params);
  }

  async getUserByEmail(params: GetUserEmailRequest): Promise<UserResponse> {
    return this.promisify<UserResponse>("GetUserEmail", params);
  }

  async listUsers(params: ListUsersRequest = {}): Promise<ListUsersResponse> {
    return this.promisify<ListUsersResponse>("ListUsers", {
      page: params.page || 1,
      limit: params.limit || 10,
      search: params.search || "",
    });
  }

  async updateUser(params: UpdateUserRequest): Promise<UpdateUserResponse> {
    return this.promisify<UpdateUserResponse>("UpdateUser", params);
  }

  async deleteUser(params: DeleteUserRequest): Promise<DeleteUserResponse> {
    return this.promisify<DeleteUserResponse>("DeleteUser", params);
  }

  // ==================== Security & Device Methods ====================

  async validateToken(
    params: ValidateTokenRequest
  ): Promise<ValidateTokenResponse> {
    return this.promisify<ValidateTokenResponse>("ValidateToken", params);
  }

  async registerDevice(
    params: RegisterDeviceRequest
  ): Promise<RegisterDeviceResponse> {
    return this.promisify<RegisterDeviceResponse>("RegisterDevice", params);
  }

  async logActivity(params: LogActivityRequest): Promise<LogActivityResponse> {
    return this.promisify<LogActivityResponse>("LogActivity", params);
  }

  async checkDeviceTrust(
    params: CheckDeviceTrustRequest
  ): Promise<CheckDeviceTrustResponse> {
    return this.promisify<CheckDeviceTrustResponse>("CheckDeviceTrust", params);
  }

  async refreshToken(
    params: RefreshTokenRequest
  ): Promise<RefreshTokenResponse> {
    return this.promisify<RefreshTokenResponse>("RefreshToken", params);
  }

  async createOrGetDeal(params: {
    conversationId: string;
    userId: string;
    propertyTitle?: string;
  }): Promise<DealResponse> {
    return this.promisify<DealResponse>("CreateOrGetDeal", params);
  }

  async listDeals(params: {
    userId: string;
    page?: number;
    limit?: number;
  }): Promise<ListDealsResponse> {
    return this.promisify<ListDealsResponse>("ListDeals", params);
  }

  async getDeal(params: { dealId: string; userId: string }): Promise<DealResponse> {
    return this.promisify<DealResponse>("GetDeal", params);
  }

  async quoteDeal(params: {
    dealId: string;
    agentId: string;
    amountMinor: number;
    platformFeeMinor: number;
    quoteNote?: string;
  }): Promise<DealResponse> {
    return this.promisify<DealResponse>("QuoteDeal", params);
  }

  async acceptDealQuote(params: {
    dealId: string;
    buyerId: string;
    idempotencyKey: string;
  }): Promise<DealResponse> {
    return this.promisify<DealResponse>("AcceptDealQuote", params);
  }

  close(): void {
    if (this.client) {
      grpc.closeClient(this.client);
      logger.info("User gRPC client closed");
    }
  }

  async waitForReady(timeoutMs: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      this.client.waitForReady(deadline, (error: any) => {
        if (error) {
          reject(
            new Error(
              `Failed to connect to user service at ${this.address}: ${error.message}`
            )
          );
        } else {
          this.connected = true;
          logger.info({ address: this.address }, "User gRPC client connected");
          resolve();
        }
      });
    });
  }

  isConnected(): boolean {
    return this.connected;
  }
}

let defaultClient: UserServiceClient | null = null;

/**
 * Get or create a singleton User Service client
 * @param address
 */
export const getUserClient = (address?: string): UserServiceClient => {
  if (!defaultClient) {
    const serverAddress =
      address || `${config.userService.host}:${config.userService.port}`;
    defaultClient = new UserServiceClient(serverAddress);
  }
  return defaultClient;
};

export const closeUserClient = (): void => {
  if (defaultClient) {
    defaultClient.close();
    defaultClient = null;
  }
};

// Create and export a singleton instance for direct usage
export const userService = getUserClient();

export default UserServiceClient;
