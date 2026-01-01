import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import config from "@config/service.config";
import logger from "@utils/logger";

// Proto loader options
const PROTO_OPTIONS: protoLoader.Options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

// User service proto path
const USER_PROTO_PATH = path.join(__dirname, "../protos/user.proto");

// Load user proto definition
const userPackageDefinition = protoLoader.loadSync(
  USER_PROTO_PATH,
  PROTO_OPTIONS
);
const userProto = grpc.loadPackageDefinition(userPackageDefinition) as any;

// Create user service client
const userServiceAddress = `${config.userService.host}:${config.userService.port}`;
const userClient = new userProto.user.UserService(
  userServiceAddress,
  grpc.credentials.createInsecure()
);

logger.info({ address: userServiceAddress }, "User gRPC client initialized");

// Promisify gRPC calls
const promisifyGrpcCall = <T>(
  client: any,
  method: string,
  request: any
): Promise<T> => {
  return new Promise((resolve, reject) => {
    client[method](request, (error: grpc.ServiceError | null, response: T) => {
      if (error) {
        logger.error({ error, method }, "gRPC call failed");
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
};

// User Service Methods - Maps to microservice's UserService
export const userService = {
  // Authentication
  signin: (data: any) => promisifyGrpcCall(userClient, "Signin", data),

  signup: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    appRole?: string;
  }) => promisifyGrpcCall(userClient, "signup", data),

  verifyOTP: (data: { email: string; otp: string }) =>
    promisifyGrpcCall(userClient, "verifyOTP", data),

  resendOTP: (data: { email: string }) =>
    promisifyGrpcCall(userClient, "resendOTP", data),

  // User CRUD
  createUser: (data: any) => promisifyGrpcCall(userClient, "CreateUser", data),
  getUser: (data: any) => promisifyGrpcCall(userClient, "GetUser", data),
  getUserByEmail: (data: any) =>
    promisifyGrpcCall(userClient, "GetUserEmail", data),
  listUsers: (data: any) => promisifyGrpcCall(userClient, "ListUsers", data),
  updateUser: (data: any) => promisifyGrpcCall(userClient, "UpdateUser", data),
  deleteUser: (data: any) => promisifyGrpcCall(userClient, "DeleteUser", data),
};

export default userClient;
