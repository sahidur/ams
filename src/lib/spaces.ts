import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// DigitalOcean Spaces Configuration
const spacesClient = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: "sgp1",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY!,
    secretAccessKey: process.env.DO_SPACES_SECRET!,
  },
  forcePathStyle: false,
});

const BUCKET = process.env.DO_SPACES_BUCKET!;
const CDN_ENDPOINT = process.env.DO_SPACES_CDN_ENDPOINT!;
const BASE_FOLDER = "sdp-ams"; // Base folder in the bucket

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Upload a file to DigitalOcean Spaces
 * @param file - File buffer or base64 string
 * @param fileName - Original file name
 * @param folder - Folder path in spaces (e.g., "profile-images", "documents")
 * @param contentType - MIME type of the file
 * @returns Upload result with URL and key
 */
export async function uploadToSpaces(
  file: Buffer | string,
  fileName: string,
  folder: string,
  contentType: string
): Promise<UploadResult> {
  // Generate unique file name
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = fileName.split(".").pop() || "";
  const uniqueFileName = `${timestamp}-${randomString}.${extension}`;
  const key = `${BASE_FOLDER}/${folder}/${uniqueFileName}`;

  // Convert base64 to buffer if needed
  let fileBuffer: Buffer;
  if (typeof file === "string") {
    // Remove data URL prefix if present
    const base64Data = file.replace(/^data:.*?;base64,/, "");
    fileBuffer = Buffer.from(base64Data, "base64");
  } else {
    fileBuffer = file;
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    ACL: "public-read",
  });

  await spacesClient.send(command);

  return {
    url: `${CDN_ENDPOINT}/${key}`,
    key,
  };
}

/**
 * Delete a file from DigitalOcean Spaces
 * @param key - The file key (path) in spaces
 */
export async function deleteFromSpaces(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await spacesClient.send(command);
}

/**
 * Extract the key from a full URL
 * @param url - Full URL of the file
 * @returns The key (path) of the file
 */
export function getKeyFromUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    const cdnEndpoint = CDN_ENDPOINT.replace(/\/$/, "");
    if (url.startsWith(cdnEndpoint)) {
      return url.replace(`${cdnEndpoint}/`, "");
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate file type
 * @param contentType - MIME type of the file
 * @param allowedTypes - Array of allowed MIME types
 * @returns Boolean indicating if file type is allowed
 */
export function isAllowedFileType(
  contentType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.some((type) => {
    if (type.endsWith("/*")) {
      const baseType = type.replace("/*", "");
      return contentType.startsWith(baseType);
    }
    return contentType === type;
  });
}

/**
 * Get allowed image types
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/**
 * Get allowed document types
 */
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/**
 * Get allowed video types
 */
export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
];

/**
 * Get allowed audio types
 */
export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
];

/**
 * All allowed attachment types for comments
 */
export const ALLOWED_ATTACHMENT_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES,
];

/**
 * Maximum file sizes in bytes
 */
export const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  attachment: 2 * 1024 * 1024 * 1024, // 2GB
};
