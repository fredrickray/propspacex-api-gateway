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

// Payment service proto path
const PAYMENT_PROTO_PATH = path.join(__dirname, "../../proto/payment/v1/payment.proto");

// Load payment proto definition
const paymentPackageDefinition = protoLoader.loadSync(
  PAYMENT_PROTO_PATH,
  PROTO_OPTIONS
);
const paymentProto = grpc.loadPackageDefinition(
  paymentPackageDefinition
) as any;

// Create payment service client
const paymentServiceAddress = `${config.paymentService.host}:${config.paymentService.port}`;
const paymentClient = new paymentProto.payment.PaymentService(
  paymentServiceAddress,
  grpc.credentials.createInsecure()
);

logger.info(
  { address: paymentServiceAddress },
  "Payment gRPC client initialized"
);

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

// Payment Service Methods
export const paymentService = {
  // Payment Initialization
  initializePayment: (data: any) =>
    promisifyGrpcCall(paymentClient, "InitializePayment", data),
  verifyPayment: (data: any) =>
    promisifyGrpcCall(paymentClient, "VerifyPayment", data),

  // Payment Management
  getPayment: (data: any) =>
    promisifyGrpcCall(paymentClient, "GetPayment", data),
  getUserPayments: (data: any) =>
    promisifyGrpcCall(paymentClient, "GetUserPayments", data),
  getPropertyPayments: (data: any) =>
    promisifyGrpcCall(paymentClient, "GetPropertyPayments", data),

  // Subscriptions
  createSubscription: (data: any) =>
    promisifyGrpcCall(paymentClient, "CreateSubscription", data),
  cancelSubscription: (data: any) =>
    promisifyGrpcCall(paymentClient, "CancelSubscription", data),
  getUserSubscriptions: (data: any) =>
    promisifyGrpcCall(paymentClient, "GetUserSubscriptions", data),

  // Refunds
  requestRefund: (data: any) =>
    promisifyGrpcCall(paymentClient, "RequestRefund", data),
  processRefund: (data: any) =>
    promisifyGrpcCall(paymentClient, "ProcessRefund", data),

  // Transactions
  getTransactionHistory: (data: any) =>
    promisifyGrpcCall(paymentClient, "GetTransactionHistory", data),

  // Webhook
  handleWebhook: (data: any) =>
    promisifyGrpcCall(paymentClient, "HandleWebhook", data),
};

export default paymentClient;
