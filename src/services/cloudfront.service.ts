import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { string } from "zod";



const cloudfront = new CloudFrontClient({
    credentials: {
        accessKeyId:process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    }
})

export const deleteFromCloudFront = async (key: string[]) => {
    
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
    }
    if (!process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID) {
        throw new Error("AWS_CLOUDFRONT_DISTRIBUTION_ID is not set in environment variables");
    }

    const invalidationCommand = new CreateInvalidationCommand(invalidationParams);

    await cloudfront.send(invalidationCommand);
}       