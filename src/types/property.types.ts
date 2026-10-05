export interface Coordinates {
  type: string;
  coordinates: number[];
}

export interface NeighborhoodHighlights {
  description: string;
  tags: string[];
}

export interface PropertyLocation {
  address: string;
  suite?: string;
  city: string;
  state: string;
  country: string;
  coordinates?: Coordinates;
  neighborhoodHighlights?: NeighborhoodHighlights;
}

export interface DimensionDetails {
  totalArea: number;
  lotSize: number;
  yearBuilt: number;
  propertyType: string;
}

export interface PropertySize {
  bedrooms: number;
  bathrooms: number;
  parkingSpaces: number;
  dimensionDetails?: DimensionDetails;
}

export interface PropertyAmenities {
  comfort: string[];
  safety: string[];
  recreation: string[];
}

export interface PropertyMedia {
  images: { url: string; mediaId: string }[];
  videos: { url: string; mediaId: string }[];
}

export interface BlockchainInfo {
  nftId: string;
  contractAddress: string;
  transactionHash: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  purpose?: string;
  price: number;
  currency: string;
  location: PropertyLocation;
  features: string[];
  size: PropertySize;
  amenities: PropertyAmenities[];
  media: PropertyMedia;
  ownerId: string;
  blockchain?: BlockchainInfo;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  flagged?: boolean;
  flagNote?: string;
  rejectionReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
}

export interface Owner {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  isVerified: boolean;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CreatePropertyRequest {
  title: string;
  description: string;
  type: string;
  price: number;
  currency: string;
  location: PropertyLocation;
  features?: string[];
  size?: PropertySize;
  amenities?: PropertyAmenities[];
  media?: PropertyMedia;
  ownerId: string;
  purpose?: string;
}

export interface GetPropertyRequest {
  propertyId: string;
}

export interface UpdatePropertyRequest {
  propertyId: string;
  userId?: string;
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  price?: number;
  currency?: string;
  location?: PropertyLocation;
  features?: string[];
  size?: PropertySize;
  amenities?: PropertyAmenities[];
  media?: PropertyMedia;
  purpose?: string;
}

export interface DeletePropertyRequest {
  propertyId: string;
  userId?: string;
}

export interface ListPropertiesRequest {
  page?: number;
  limit?: number;
  sort?: string;
  type?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  country?: string;
  bedrooms?: number;
  bathrooms?: number;
  ownerId?: string;
  isActive?: boolean;
  search?: string;
  filterByActive?: boolean;
  flagged?: boolean;
  filterByFlagged?: boolean;
  callerRole?: string;
  includeInactive?: boolean;
  purpose?: string;
}

export interface PendingDocumentReview {
  id: string;
  propertyId: string;
  documentType: string;
  createdAt: string;
}

export interface ListPendingDocumentReviewsRequest {
  page?: number;
  limit?: number;
}

export interface ListPendingDocumentReviewsResponse {
  success: boolean;
  message: string;
  reviews: PendingDocumentReview[];
  total: number;
  page: number;
  limit: number;
}

export interface GetPropertiesByOwnerRequest {
  ownerId: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface SearchByLocationRequest {
  query: string;
  type: string;
  listingType: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  country?: string;
  bedrooms?: number;
  bathrooms?: number;
  page?: number;
  limit?: number;
}

export interface UpdatePropertyStatusRequest {
  propertyId: string;
  userId?: string;
  status: string;
}

export interface ApprovePropertyRequest {
  propertyId: string;
  adminId: string;
}

export interface RejectPropertyRequest {
  propertyId: string;
  adminId: string;
  reason: string;
}

export interface EscalatePropertyRequest {
  propertyId: string;
  adminId: string;
  note: string;
}

export interface UpdateMediaRequest {
  propertyId: string;
  userId?: string;
  images?: string[];
  videos?: string[];
}

export interface UpdateBlockchainRequest {
  propertyId: string;
  userId?: string;
  nftId: string;
  contractAddress: string;
  transactionHash: string;
}

export interface GetOwnerStatsRequest {
  ownerId: string;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

export interface PropertyResponse {
  success: boolean;
  message: string;
  property: Property;
}

export interface PropertyWithOwnerResponse {
  success: boolean;
  message: string;
  property: Property;
  owner: Owner;
}

export interface PropertiesResponse {
  success: boolean;
  message: string;
  properties: Property[];
  pagination: PaginationInfo;
}

export interface OwnerStatsResponse {
  success: boolean;
  total: number;
  available: number;
  rented: number;
  sold: number;
  pending: number;
}

// ==================== Document Types ====================

export interface DocumentInfo {
  url: string;
  mediaId: string;
  isVerified?: boolean;
}

export interface PropertyDocument {
  id: string;
  propertyId: string;
  deedDocument?: DocumentInfo;
  inspectionReport?: DocumentInfo;
  appraisalReport?: DocumentInfo;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePropertyDocumentsRequest {
  propertyId: string;
  deedDocument: DocumentInfo;
  inspectionReport?: DocumentInfo;
  appraisalReport?: DocumentInfo;
}

export interface GetPropertyDocumentsRequest {
  propertyId: string;
}

export interface UpdatePropertyDocumentRequest {
  propertyId: string;
  userId: string;
  documentType: "deedDocument" | "inspectionReport" | "appraisalReport";
  document: DocumentInfo;
}

export interface DeletePropertyDocumentRequest {
  propertyId: string;
  userId: string;
  documentType: "deedDocument" | "inspectionReport" | "appraisalReport";
}

export interface VerifyPropertyDocumentRequest {
  propertyId: string;
  documentType: "deedDocument" | "inspectionReport" | "appraisalReport";
  isVerified: boolean;
}

export interface PropertyDocumentResponse {
  success: boolean;
  message: string;
  document: PropertyDocument;
}

export interface DocumentVerificationStatus {
  deedDocumentVerified: boolean;
  inspectionReportVerified: boolean;
  appraisalReportVerified: boolean;
  allVerified: boolean;
}

export interface DocumentVerificationStatusResponse {
  success: boolean;
  message: string;
  status: DocumentVerificationStatus;
}
