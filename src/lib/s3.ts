import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.REGION || "ap-south-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID!;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY!;
const bucket = process.env.CONTENT_IMAGES_BUCKET!;

if (!accessKeyId || !secretAccessKey || !bucket) {
  throw new Error("❌ Missing AWS environment variables");
}

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Uploads an image buffer to S3 and returns the public S3 URL.
 *
 * The returned key will be:
 * images/<uuid>.<extension>
 */export async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  try {
    const extension = path.extname(fileName);
    const finalFileName = `images/${uuidv4()}${extension}`;

    const upload = new Upload({
      client: s3Client,

      params: {
        Bucket: bucket,
        Key: finalFileName,
        Body: fileBuffer,
        ContentType: contentType,
        CacheControl: "max-age=31536000",
      },

      queueSize: 4,
      partSize: 5 * 1024 * 1024,
      leavePartsOnError: false,
    });

    const result = await upload.done();

    return result.Location!
  } catch (error) {
    console.error("❌ S3 upload error:", error);
    throw error;
  }
}
export async function getSignedS3Url(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn,
  });
}