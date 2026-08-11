import { S3, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION || "ap-south-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID!;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY!;
const bucket = process.env.CONTENT_IMAGES_BUCKET!;

const s3Client = new S3({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Uploads a file to S3 and returns the object key.
 */
export async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  await s3Client.putObject({
    Bucket: bucket,
    Key: fileName,
    Body: fileBuffer,
    ContentType: contentType,
  });

  return fileName;
}

/**
 * Generates a signed URL to view a private S3 object securely.
 */
export async function getSignedS3Url(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  return getSignedUrl(s3Client, command, { expiresIn });
}
