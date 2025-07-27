import TryCatch from "@/lib/healpers";
import { ErrorHandler } from "@/lib/utils";
import { generateUploadUrl, generateDownloadUrl, deleteFile } from "@/services/s3.service";
import db from '../lib/db';
import { deleteFromCloudFront } from "@/services/cloudfront.service";

export const getUploadUrl = TryCatch(async (req, res, next) => {
    const { key, contentType, fileSize } = req.body;
    const userId = req.user?.id;
    if (!key || !contentType) {
        return next(new ErrorHandler("Key and content type are required", 400));
    }

    if (!fileSize) {
        return next(new ErrorHandler("File size not provided", 400));
    }

    const user = await db.user.findUnique({
        where: {
            id: userId
        }
    })
    if (!user) {
        return next(new ErrorHandler("User not found", 401));
    }

    const allowedStorage = user?.allocatedStorage;
    const usedStorage = user.storageUsed

    if (BigInt(usedStorage) + BigInt(fileSize) > BigInt(allowedStorage)) {
        return res.status(400).json({ error: "Storage limit exceeded" });
    }

    if (typeof key !== "string" || typeof contentType !== "string") {
        return next(new ErrorHandler("Key and content type must be strings", 400));
    }


    const url = await generateUploadUrl(key, contentType);

    res.json({ success: true, url });
});


export const getDownloadUrl = TryCatch(async (req, res, next) => {
    const { key } = req.query;

    if (!key || typeof key !== "string") {
        return next(new ErrorHandler("Key is required and must be a string", 400));
    }

    const url = await generateDownloadUrl(key as string);
    res.json({ success: true, url });
});


export const removeFile = TryCatch(async (req, res, next) => {
    const { key, clientId, fileId } = req.body;

    if (!key || typeof key !== "string" || !clientId || typeof clientId !== "string") {
        return next(new ErrorHandler("Key and clientId are required and must be strings", 400));
    }

    const userId = req.user?.id;
    if (!userId) {
        return next(new ErrorHandler("User not found", 401));
    }

    const client = await db.client.findUnique({
        where: {
            caId: userId,
            id: clientId
        }
    });

    if (!client) {
        return next(new ErrorHandler("Client not found", 401));
    }

    const file = await db.document.findUnique({
        where: {
            id: fileId,
            fileKey: key,
            clientId: clientId
        }
    });


    if (!file) {
        return next(new ErrorHandler("file not found", 404));
    }

    if (file.clientId !== clientId) {
        return next(new ErrorHandler("You are not authorized to delete this file", 403));
    }

    await db.$transaction(async (tx) => {
        await tx.document.delete({
            where: {
                id: file.id,
                fileKey: key,
                clientId: clientId
            }
        });

        await tx.client.update({
            where: {
                id: clientId
            },
            data: {
                storageUsed: {
                    decrement: file.fileSize
                }
            }
        })

        await tx.user.update({
            where: {
                id: userId
            },
            data: {
                storageUsed: {
                    decrement: file.fileSize
                }
            }
        });
    })

    let keyarr: string[] = [];

    if (file.fileName.endsWith(".pdf")) {
        keyarr = [key, file.thumbnailKey!];

        await deleteFile(file.thumbnailKey!);
        await deleteFile(key);

    } else {
        keyarr = [key];

        await deleteFile(key);
    }

    await deleteFromCloudFront(keyarr);


    res.json({ success: true, message: "Deleted" });
});

