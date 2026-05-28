import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 5 * 1024 * 1024;

export function validateUpload(file: Express.Multer.File): void {
  if (file.size > MAX_BYTES) {
    throw Object.assign(new Error('File exceeds 5 MB'), { code: 'FILE_TOO_LARGE', status: 413 });
  }
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    throw Object.assign(new Error('Only PDF, JPG, or PNG files are allowed'), {
      code: 'INVALID_FILE_TYPE',
      status: 400,
    });
  }
}

export async function uploadToS3(file: Express.Multer.File, folder: string): Promise<string> {
  validateUpload(file);
  const ext = file.originalname.split('.').pop() ?? 'bin';
  const key = `${folder}/${uuidv4()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}
