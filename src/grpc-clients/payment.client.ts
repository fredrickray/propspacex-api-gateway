import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import config from "@config/service.config";
import logger from "@utils/logger";

const PROTO_OPTIONS: protoLoader.Options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

const PAYMENT_PROTO_PATH = path.join(__dirname, "../../proto/payment/v1/payment.proto");

const paymentPackageDefinition = protoLoader.loadSync(PAYMENT_PROTO_PATH, PROTO_OPTIONS);
const paymentProto = grpc.loadPackageDefinition(paymentPackageDefinition) as any;

const paymentServiceAddress = `${config.paymentService.host}:${config.paymentService.port}`;

const paymentClient = new paymentProto.payment.PaymentService(
  paymentServiceAddress,
  grpc.credentials.createInsecure()
);

const walletClient = new paymentProto.payment.WalletService(
  paymentServiceAddress,
  grpc.credentials.createInsecure()
);

const escrowClient = new paymentProto.payment.EscrowService(
  paymentServiceAddress,
  grpc.credentials.createInsecure()
);

logger.info({ address: paymentServiceAddress }, "Payment gRPC clients initialized");

const promisifyGrpcCall = <T>(
  client: any,
  method: string,
  request: object
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

export interface CreatePaymentIntentGrpcRequest {
  buyer_user_id: string;
  escrow_id: string;
  amount_minor: number;
  currency_code: number;
  provider: string;
  email: string;
  callback_url?: string;
  idempotency_key: string;
  purpose: number;
}

export interface VerifyPaymentByReferenceGrpcRequest {
  provider: string;
  reference: string;
}

export interface HandleProviderWebhookGrpcRequest {
  provider: string;
  signature: string;
  event: string;
  payload_json: string;
}

export interface CreateWalletTopupIntentGrpcRequest {
  user_id: string;
  amount_minor: number;
  currency_code: number;
  provider: string;
  email: string;
  callback_url?: string;
  idempotency_key: string;
}

export interface VerifyWalletTopupGrpcRequest {
  provider: string;
  reference: string;
}

export const paymentService = {
  createPaymentIntent: (data: CreatePaymentIntentGrpcRequest) =>
    promisifyGrpcCall(paymentClient, "CreatePaymentIntent", data),
  verifyPaymentByReference: (data: VerifyPaymentByReferenceGrpcRequest) =>
    promisifyGrpcCall(paymentClient, "VerifyPaymentByReference", data),
  handleProviderWebhook: (data: HandleProviderWebhookGrpcRequest) =>
    promisifyGrpcCall(paymentClient, "HandleProviderWebhook", data),
  createWalletTopupIntent: (data: CreateWalletTopupIntentGrpcRequest) =>
    promisifyGrpcCall(paymentClient, "CreateWalletTopupIntent", data),
  verifyWalletTopup: (data: VerifyWalletTopupGrpcRequest) =>
    promisifyGrpcCall(paymentClient, "VerifyWalletTopup", data),
};

export const walletService = {
  createWallet: (data: Record<string, unknown>) =>
    promisifyGrpcCall(walletClient, "CreateWallet", data),
  getWalletByUserId: (data: Record<string, unknown>) =>
    promisifyGrpcCall(walletClient, "GetWalletByUserId", data),
  getWalletById: (data: Record<string, unknown>) =>
    promisifyGrpcCall(walletClient, "GetWalletById", data),
  creditWallet: (data: Record<string, unknown>) =>
    promisifyGrpcCall(walletClient, "CreditWallet", data),
  debitWallet: (data: Record<string, unknown>) =>
    promisifyGrpcCall(walletClient, "DebitWallet", data),
  listWalletTransactions: (data: Record<string, unknown>) =>
    promisifyGrpcCall(walletClient, "ListWalletTransactions", data),
  requestWithdrawal: (data: Record<string, unknown>) =>
    promisifyGrpcCall(walletClient, "RequestWithdrawal", data),
  listWithdrawals: (data: Record<string, unknown>) =>
    promisifyGrpcCall(walletClient, "ListWithdrawals", data),
};

export const escrowService = {
  createEscrow: (data: Record<string, unknown>) =>
    promisifyGrpcCall(escrowClient, "CreateEscrow", data),
  getEscrowById: (data: Record<string, unknown>) =>
    promisifyGrpcCall(escrowClient, "GetEscrowById", data),
  getEscrowByDealRef: (data: Record<string, unknown>) =>
    promisifyGrpcCall(escrowClient, "GetEscrowByDealRef", data),
  listEscrowsByUser: (data: Record<string, unknown>) =>
    promisifyGrpcCall(escrowClient, "ListEscrowsByUser", data),
  markEscrowServiceComplete: (data: Record<string, unknown>) =>
    promisifyGrpcCall(escrowClient, "MarkEscrowServiceComplete", data),
  releaseEscrow: (data: Record<string, unknown>) =>
    promisifyGrpcCall(escrowClient, "ReleaseEscrow", data),
  cancelEscrow: (data: Record<string, unknown>) =>
    promisifyGrpcCall(escrowClient, "CancelEscrow", data),
  openEscrowDispute: (data: Record<string, unknown>) =>
    promisifyGrpcCall(escrowClient, "OpenEscrowDispute", data),
  resolveEscrowDispute: (data: Record<string, unknown>) =>
    promisifyGrpcCall(escrowClient, "ResolveEscrowDispute", data),
  getEscrowTimeline: (data: Record<string, unknown>) =>
    promisifyGrpcCall(escrowClient, "GetEscrowTimeline", data),
};

export default paymentClient;
