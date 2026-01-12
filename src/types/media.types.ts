export interface MediaItem {
  id: string;
  fileName: string;
  url: string;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  type: "image" | "video" | "document";
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  entityType: string;
  entityId: string;
  fieldName: string;
  uploadedBy: string;
  storageProvider: string;
  storagePath: string;
  isProcessed: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum entityType {
  USER = "user",
  PROPERTY = "property",
}

export interface UploadOptions {
  entityType: entityType;
  entityId: string;
  fieldName: string;
  uploadedBy: string;
}

export interface GrpcResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface BulkDeleteResponse {
  success: boolean;
  message: string;
  deleted: number;
  failed: string[];
}
