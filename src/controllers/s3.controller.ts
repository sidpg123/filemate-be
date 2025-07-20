import TryCatch from "@/lib/healpers";
import { ErrorHandler } from "@/lib/utils";
import { generateUploadUrl, generateDownloadUrl, deleteFile } from "@/services/s3.service";

export const getUploadUrl = TryCatch(async (req, res, next) => {
    const { key, contentType } = req.body;

    if (!key || !contentType) {
        return next(new ErrorHandler("Key and content type are required", 400));
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
    const { key } = req.body;

    if( !key || typeof key !== "string") {
        return next(new ErrorHandler("Key is required and must be a string", 400));
    }

    await deleteFile(key);
    
    res.json({ success: true, message: "Deleted" });
});

