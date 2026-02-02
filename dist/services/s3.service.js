"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.generateDownloadUrl = exports.generateUploadUrl = void 0;
const aws_1 = require("@/config/aws");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const generateUploadUrl = async (key, contentType) => {
    const command = new client_s3_1.PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)(aws_1.s3Client, command, { expiresIn: 60 * 5 });
    return url;
};
exports.generateUploadUrl = generateUploadUrl;
const generateDownloadUrl = async (key) => {
    const command = new client_s3_1.GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
    });
    return (0, s3_request_presigner_1.getSignedUrl)(aws_1.s3Client, command, { expiresIn: 60 * 5 });
};
exports.generateDownloadUrl = generateDownloadUrl;
const deleteFile = async (key) => {
    const command = new client_s3_1.DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
    });
    await aws_1.s3Client.send(command);
};
exports.deleteFile = deleteFile;
