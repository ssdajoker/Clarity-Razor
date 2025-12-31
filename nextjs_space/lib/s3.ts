import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client, getBucketConfig } from "./aws-config";

const s3Client = createS3Client();

/**
 * Generate a presigned URL for uploading a file directly to S3
 * @param fileName - Original file name
 * @param contentType - MIME type of the file
 * @param isPublic - Whether the file should be publicly accessible
 * @returns Object with uploadUrl and cloud_storage_path
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic: boolean = false
) {
  const { bucketName, folderPrefix } = getBucketConfig();
  
  // Generate cloud storage path
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${timestamp}-${sanitizedFileName}`
    : `${folderPrefix}uploads/${timestamp}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 60 minutes
  });

  return {
    uploadUrl,
    cloud_storage_path,
  };
}

/**
 * Get a URL to access a file (public or signed)
 * @param cloud_storage_path - S3 key for the file
 * @param isPublic - Whether the file is publicly accessible
 * @returns URL to access the file
 */
export async function getFileUrl(
  cloud_storage_path: string,
  isPublic: boolean = false
) {
  const { bucketName } = getBucketConfig();
  
  if (isPublic) {
    // Return public URL
    const region = process.env.AWS_REGION || "us-east-1";
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  } else {
    // Generate signed URL
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cloud_storage_path,
    });

    return await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 60 minutes
    });
  }
}

/**
 * Delete a file from S3
 * @param cloud_storage_path - S3 key for the file
 */
export async function deleteFile(cloud_storage_path: string) {
  const { bucketName } = getBucketConfig();
  
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
  });

  await s3Client.send(command);
}
