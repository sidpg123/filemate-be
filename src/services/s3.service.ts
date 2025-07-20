import { s3Client  } from "@/config/aws";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";



export const generateUploadUrl = async (key: string, contentType: string) => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });
  return url;
};



export const generateDownloadUrl = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });
};



export const deleteFile = async (key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
};
