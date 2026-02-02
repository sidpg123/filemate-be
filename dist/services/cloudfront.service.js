"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromCloudFront = void 0;
const client_cloudfront_1 = require("@aws-sdk/client-cloudfront");
const cloudfront = new client_cloudfront_1.CloudFrontClient({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    }
});
const deleteFromCloudFront = async (key) => {
    // key = key.startsWith("/") ? key : `/${key}`;
    // key = key.endsWith("/") ? key.slice(0, -1) : key;
    key = key.map(k => k.startsWith("/") ? k : `/${k}`);
    const invalidationParams = {
        DistributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID || "",
        InvalidationBatch: {
            CallerReference: Date.now().toString(),
            Paths: {
                Quantity: key.length,
                Items: key
            }
        }
    };
    if (!process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID) {
        throw new Error("AWS_CLOUDFRONT_DISTRIBUTION_ID is not set in environment variables");
    }
    const invalidationCommand = new client_cloudfront_1.CreateInvalidationCommand(invalidationParams);
    await cloudfront.send(invalidationCommand);
};
exports.deleteFromCloudFront = deleteFromCloudFront;
