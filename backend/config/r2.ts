import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { Buffer } from 'node:buffer'

type R2Settings = {
    accountId: string
    accessKeyId: string
    secretAccessKey: string
    bucketName: string
    publicUrl: string
}

type UploadProfilePictureInput = {
    key: string
    body: Buffer
    contentType: string
}

const getRequiredEnv = (name: string) => {
    const value = process.env[name];

    if (!value) {
        throw new Error(`${name} is required for R2 uploads`);
    }

    return value;
}

const getR2Settings = (): R2Settings => {
    return {
        accountId: getRequiredEnv('R2_ACCOUNT_ID'),
        accessKeyId: getRequiredEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: getRequiredEnv('R2_SECRET_ACCESS_KEY'),
        bucketName: getRequiredEnv('R2_BUCKET_NAME'),
        publicUrl: getRequiredEnv('R2_PUBLIC_URL').replace(/\/$/, '')
    }
}

const createR2Client = (settings: R2Settings) => {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${settings.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey
        }
    });
}

export const uploadProfilePictureToR2 = async({
    key,
    body,
    contentType
}: UploadProfilePictureInput) => {
    const settings = getR2Settings();
    const r2Client = createR2Client(settings);

    await r2Client.send(new PutObjectCommand({
        Bucket: settings.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable'
    }));

    return `${settings.publicUrl}/${key}`;
}

export const deleteProfilePictureFromR2 = async(key: string) => {
    const settings = getR2Settings();
    const r2Client = createR2Client(settings);

    await r2Client.send(new DeleteObjectCommand({
        Bucket: settings.bucketName,
        Key: key
    }));
}
