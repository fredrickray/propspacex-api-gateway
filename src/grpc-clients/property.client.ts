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
  updateProperty: (data: any) =>
    promisifyGrpcCall(propertyClient, "UpdateProperty", data),
  deleteProperty: (data: any) =>
    promisifyGrpcCall(propertyClient, "DeleteProperty", data),

  // Property Listings
  getProperties: (data: any) =>
    promisifyGrpcCall(propertyClient, "GetProperties", data),
  getPropertiesByOwner: (data: any) =>
    promisifyGrpcCall(propertyClient, "GetPropertiesByOwner", data),
  searchProperties: (data: any) =>
    promisifyGrpcCall(propertyClient, "SearchProperties", data),
  getFeaturedProperties: (data: any) =>
    promisifyGrpcCall(propertyClient, "GetFeaturedProperties", data),

  // Property Status
  updatePropertyStatus: (data: any) =>
    promisifyGrpcCall(propertyClient, "UpdatePropertyStatus", data),
  markAsSold: (data: any) =>
    promisifyGrpcCall(propertyClient, "MarkAsSold", data),
  markAsRented: (data: any) =>
    promisifyGrpcCall(propertyClient, "MarkAsRented", data),

  // Property Media
  addPropertyImages: (data: any) =>
    promisifyGrpcCall(propertyClient, "AddPropertyImages", data),
  removePropertyImage: (data: any) =>
    promisifyGrpcCall(propertyClient, "RemovePropertyImage", data),

  // Favorites
  addToFavorites: (data: any) =>
    promisifyGrpcCall(propertyClient, "AddToFavorites", data),
  removeFromFavorites: (data: any) =>
    promisifyGrpcCall(propertyClient, "RemoveFromFavorites", data),
  getUserFavorites: (data: any) =>
    promisifyGrpcCall(propertyClient, "GetUserFavorites", data),

  // Reviews
  addPropertyReview: (data: any) =>
    promisifyGrpcCall(propertyClient, "AddPropertyReview", data),
  getPropertyReviews: (data: any) =>
    promisifyGrpcCall(propertyClient, "GetPropertyReviews", data),
};

export default propertyClient;
