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

// Property service proto path
const PROPERTY_PROTO_PATH = path.join(__dirname, "../protos/property.proto");

// Load property proto definition
const propertyPackageDefinition = protoLoader.loadSync(
  PROPERTY_PROTO_PATH,
  PROTO_OPTIONS
);
const propertyProto = grpc.loadPackageDefinition(
  propertyPackageDefinition
) as any;

// Create property service client
const propertyServiceAddress = `${config.propertyService.host}:${config.propertyService.port}`;
const propertyClient = new propertyProto.property.PropertyService(
  propertyServiceAddress,
  grpc.credentials.createInsecure()
);

logger.info(
  { address: propertyServiceAddress },
  "Property gRPC client initialized"
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

// Property Service Methods
export const propertyService = {
  // Property CRUD
  createProperty: (data: any) =>
    promisifyGrpcCall(propertyClient, "CreateProperty", data),
  getProperty: (data: any) =>
    promisifyGrpcCall(propertyClient, "GetProperty", data),
  getPropertyWithOwner: (data: any) =>
    promisifyGrpcCall(propertyClient, "GetPropertyWithOwner", data),
  updateProperty: (data: any) =>
    promisifyGrpcCall(propertyClient, "UpdateProperty", data),
  deleteProperty: (data: any) =>
    promisifyGrpcCall(propertyClient, "DeleteProperty", data),
  hardDeleteProperty: (data: any) =>
    promisifyGrpcCall(propertyClient, "HardDeleteProperty", data),

  // Property Listings
  getProperties: (data: any) =>
    promisifyGrpcCall(propertyClient, "ListProperties", data),
  listProperties: (data: any) =>
    promisifyGrpcCall(propertyClient, "ListProperties", data),
  getPropertiesByOwner: (data: any) =>
    promisifyGrpcCall(propertyClient, "GetPropertiesByOwner", data),
  searchProperties: (data: any) =>
    promisifyGrpcCall(propertyClient, "SearchByLocation", data),
  searchByLocation: (data: any) =>
    promisifyGrpcCall(propertyClient, "SearchByLocation", data),

  // Property Status
  updatePropertyStatus: (data: any) =>
    promisifyGrpcCall(propertyClient, "UpdatePropertyStatus", data),

  // Property Media
  updatePropertyMedia: (data: any) =>
    promisifyGrpcCall(propertyClient, "UpdatePropertyMedia", data),
  addPropertyMedia: (data: any) =>
    promisifyGrpcCall(propertyClient, "AddPropertyMedia", data),

  // Blockchain
  updateBlockchainInfo: (data: any) =>
    promisifyGrpcCall(propertyClient, "UpdateBlockchainInfo", data),

  // Statistics
  getOwnerPropertyStats: (data: any) =>
    promisifyGrpcCall(propertyClient, "GetOwnerPropertyStats", data),
};

export default propertyClient;
