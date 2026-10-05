import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";
import config from "@config/service.config";
import logger from "@utils/logger";
import {
  CreatePropertyRequest,
  GetPropertyRequest,
  UpdatePropertyRequest,
  DeletePropertyRequest,
  ListPropertiesRequest,
  GetPropertiesByOwnerRequest,
  SearchByLocationRequest,
  UpdatePropertyStatusRequest,
  ApprovePropertyRequest,
  RejectPropertyRequest,
  EscalatePropertyRequest,
  UpdateMediaRequest,
  UpdateBlockchainRequest,
  GetOwnerStatsRequest,
  MessageResponse,
  PropertiesResponse,
  PropertyWithOwnerResponse,
  PropertyResponse,
  OwnerStatsResponse,
  CreatePropertyDocumentsRequest,
  GetPropertyDocumentsRequest,
  UpdatePropertyDocumentRequest,
  DeletePropertyDocumentRequest,
  VerifyPropertyDocumentRequest,
  PropertyDocumentResponse,
  DocumentVerificationStatusResponse,
  ListPendingDocumentReviewsRequest,
  ListPendingDocumentReviewsResponse,
} from "@type/property.types";

const protoLoaderOptions: protoLoader.Options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

export class PropertyServiceClient {
  private client: any;
  private connected: boolean = false;

  constructor(private address: string, protoPath?: string) {
    const PROTO_PATH =
      protoPath || path.join(__dirname, "../../proto/property/v1/property.proto");
    const packageDefinition = protoLoader.loadSync(
      PROTO_PATH,
      protoLoaderOptions
    );
    const propertyProto = grpc.loadPackageDefinition(packageDefinition) as any;

    this.client = new propertyProto.property.PropertyService(
      address,
      grpc.credentials.createInsecure()
    );

    logger.info({ address }, "Property gRPC client initialized");
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

  async createProperty(
    params: CreatePropertyRequest
  ): Promise<PropertyResponse> {
    return this.promisify<PropertyResponse>("CreateProperty", params);
  }

  async getProperty(params: GetPropertyRequest): Promise<PropertyResponse> {
    return this.promisify<PropertyResponse>("GetProperty", params);
  }

  async getPropertyWithOwner(
    params: GetPropertyRequest
  ): Promise<PropertyWithOwnerResponse> {
    return this.promisify<PropertyWithOwnerResponse>(
      "GetPropertyWithOwner",
      params
    );
  }

  async updateProperty(
    params: UpdatePropertyRequest
  ): Promise<PropertyResponse> {
    return this.promisify<PropertyResponse>("UpdateProperty", params);
  }

  async deleteProperty(
    params: DeletePropertyRequest
  ): Promise<MessageResponse> {
    return this.promisify<MessageResponse>("DeleteProperty", params);
  }

  async hardDeleteProperty(
    params: DeletePropertyRequest
  ): Promise<MessageResponse> {
    return this.promisify<MessageResponse>("HardDeleteProperty", params);
  }

  // ==================== Property Listings ====================

  async listProperties(
    params: ListPropertiesRequest = {}
  ): Promise<PropertiesResponse> {
    return this.promisify<PropertiesResponse>("ListProperties", {
      page: params.page || 1,
      limit: params.limit || 10,
      ...params,
    });
  }

  async getProperties(
    params: ListPropertiesRequest = {}
  ): Promise<PropertiesResponse> {
    return this.listProperties(params);
  }

  async recordPropertyView(params: {
    propertyId: string;
    viewerId?: string;
  }): Promise<{ success: boolean }> {
    return this.promisify<{ success: boolean }>("RecordPropertyView", {
      propertyId: params.propertyId,
      viewerId: params.viewerId || "",
    });
  }

  async getAgentViewStats(ownerId: string): Promise<{
    views: number;
    viewsLastMonth: number;
    activeListings: number;
    listingsCreatedThisMonth: number;
    months: Array<{ month: string; views: number }>;
    topProperties: Array<{ propertyId: string; title: string; views: number }>;
  }> {
    return this.promisify("GetAgentViewStats", { ownerId });
  }

  async listPendingDocumentReviews(
    params: ListPendingDocumentReviewsRequest = {}
  ): Promise<ListPendingDocumentReviewsResponse> {
    return this.promisify<ListPendingDocumentReviewsResponse>(
      "ListPendingDocumentReviews",
      {
        page: params.page || 1,
        limit: params.limit || 20,
      }
    );
  }

  async getPropertiesByOwner(
    params: GetPropertiesByOwnerRequest
  ): Promise<PropertiesResponse> {
    return this.promisify<PropertiesResponse>("GetPropertiesByOwner", {
      page: params.page || 1,
      limit: params.limit || 10,
      ...params,
    });
  }

  async searchByLocation(
    params: SearchByLocationRequest
  ): Promise<PropertiesResponse> {
    return this.promisify<PropertiesResponse>("SearchByLocation", {
      page: params.page || 1,
      limit: params.limit || 10,
      ...params,
    });
  }

  async searchProperties(
    params: SearchByLocationRequest
  ): Promise<PropertiesResponse> {
    return this.searchByLocation(params);
  }

  // ==================== Property Status ====================

  async updatePropertyStatus(
    params: UpdatePropertyStatusRequest
  ): Promise<PropertyResponse> {
    return this.promisify<PropertyResponse>("UpdatePropertyStatus", params);
  }

  async approveProperty(
    params: ApprovePropertyRequest
  ): Promise<PropertyResponse> {
    return this.promisify<PropertyResponse>("ApproveProperty", params);
  }

  async rejectProperty(
    params: RejectPropertyRequest
  ): Promise<PropertyResponse> {
    return this.promisify<PropertyResponse>("RejectProperty", params);
  }

  async escalateProperty(
    params: EscalatePropertyRequest
  ): Promise<PropertyResponse> {
    return this.promisify<PropertyResponse>("EscalateProperty", params);
  }

  async markAsSold(
    propertyId: string,
    userId?: string
  ): Promise<PropertyResponse> {
    return this.updatePropertyStatus({ propertyId, userId, status: "sold" });
  }

  async markAsRented(
    propertyId: string,
    userId?: string
  ): Promise<PropertyResponse> {
    return this.updatePropertyStatus({ propertyId, userId, status: "rented" });
  }

  // ==================== Property Media ====================

  async updatePropertyMedia(
    params: UpdateMediaRequest
  ): Promise<PropertyResponse> {
    return this.promisify<PropertyResponse>("UpdatePropertyMedia", params);
  }

  async addPropertyMedia(
    params: UpdateMediaRequest
  ): Promise<PropertyResponse> {
    return this.promisify<PropertyResponse>("AddPropertyMedia", params);
  }

  async addPropertyImages(params: {
    propertyId: string;
    images: string[];
    userId?: string;
  }): Promise<PropertyResponse> {
    return this.addPropertyMedia({
      propertyId: params.propertyId,
      userId: params.userId,
      images: params.images,
    });
  }

  async removePropertyImage(params: {
    propertyId: string;
    imageUrl: string;
    userId?: string;
  }): Promise<PropertyResponse> {
    // Note: This may need adjustment based on actual proto implementation
    return this.updatePropertyMedia({
      propertyId: params.propertyId,
      userId: params.userId,
    });
  }

  // ==================== Blockchain ====================

  async updateBlockchainInfo(
    params: UpdateBlockchainRequest
  ): Promise<PropertyResponse> {
    return this.promisify<PropertyResponse>("UpdateBlockchainInfo", params);
  }

  // ==================== Statistics ====================

  async getOwnerPropertyStats(
    params: GetOwnerStatsRequest
  ): Promise<OwnerStatsResponse> {
    return this.promisify<OwnerStatsResponse>("GetOwnerPropertyStats", params);
  }

  async createPropertyDocuments(
    params: CreatePropertyDocumentsRequest
  ): Promise<PropertyDocumentResponse> {
    return this.promisify<PropertyDocumentResponse>(
      "CreatePropertyDocuments",
      params
    );
  }

  async getPropertyDocuments(
    params: GetPropertyDocumentsRequest
  ): Promise<PropertyDocumentResponse> {
    return this.promisify<PropertyDocumentResponse>(
      "GetPropertyDocuments",
      params
    );
  }

  async updatePropertyDocument(
    params: UpdatePropertyDocumentRequest
  ): Promise<PropertyDocumentResponse> {
    return this.promisify<PropertyDocumentResponse>(
      "UpdatePropertyDocument",
      params
    );
  }

  async deletePropertyDocument(
    params: DeletePropertyDocumentRequest
  ): Promise<MessageResponse> {
    return this.promisify<MessageResponse>("DeletePropertyDocument", params);
  }

  async verifyPropertyDocument(
    params: VerifyPropertyDocumentRequest
  ): Promise<PropertyDocumentResponse> {
    return this.promisify<PropertyDocumentResponse>(
      "VerifyPropertyDocument",
      params
    );
  }

  async getDocumentVerificationStatus(
    params: GetPropertyDocumentsRequest
  ): Promise<DocumentVerificationStatusResponse> {
    return this.promisify<DocumentVerificationStatusResponse>(
      "GetDocumentVerificationStatus",
      params
    );
  }

  // ==================== Connection Management ====================

  close(): void {
    if (this.client) {
      grpc.closeClient(this.client);
      logger.info("Property gRPC client closed");
    }
  }

  async waitForReady(timeoutMs: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      this.client.waitForReady(deadline, (error: any) => {
        if (error) {
          reject(
            new Error(
              `Failed to connect to property service at ${this.address}: ${error.message}`
            )
          );
        } else {
          this.connected = true;
          logger.info(
            { address: this.address },
            "Property gRPC client connected"
          );
          resolve();
        }
      });
    });
  }

  isConnected(): boolean {
    return this.connected;
  }
}

let defaultClient: PropertyServiceClient | null = null;

export const getPropertyClient = (address?: string): PropertyServiceClient => {
  if (!defaultClient) {
    const serverAddress =
      address ||
      `${config.propertyService.host}:${config.propertyService.port}`;
    defaultClient = new PropertyServiceClient(serverAddress);
  }
  return defaultClient;
};

export const closePropertyClient = (): void => {
  if (defaultClient) {
    defaultClient.close();
    defaultClient = null;
  }
};

export const propertyService = getPropertyClient();

export default PropertyServiceClient;
