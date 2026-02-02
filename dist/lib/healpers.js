"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorageByPlan = exports.getThumbnailImageKey = void 0;
const TryCatch = (passedFunc) => async (req, res, next) => {
    try {
        await passedFunc(req, res, next);
    }
    catch (error) {
        next(error);
    }
};
exports.default = TryCatch;
const thumbnailMap = {
    doc: '/thumbnails/docx.png',
    docx: '/thumbnails/docx.png',
    xls: '/thumbnails/xlsx.png',
    xlsx: '/thumbnails/xlsx.png',
    ppt: '/thumbnails/pptx.png',
    pptx: '/thumbnails/pptx.png',
    txt: '/thumbnails/txt.png',
    csv: '/thumbnails/csv.png',
    json: '/thumbnails/json.png',
    zip: '/thumbnails/zip.png',
    rar: '/thumbnails/rar.png',
    // pdf: '/thumbnails/pdf.png',
};
const getThumbnailImageKey = (fileType) => {
    return thumbnailMap[fileType] || '/thumbnails/default.png';
};
exports.getThumbnailImageKey = getThumbnailImageKey;
const planToStorageMap = {
    "925463d3-b270-45b5-8974-944427991663": BigInt(10 * 1024 * 1024 * 1024), //10 GB
    "83f76a56-bf26-4d93-920e-31f9b6e425fd": BigInt(10 * 1024 * 1024 * 1024), //10 GB
    "e77dbc82-7325-4823-b3bc-1e8d4675946c": BigInt(5 * 1024 * 1024), //500 MB
};
const getStorageByPlan = (plan) => {
    return planToStorageMap[plan];
};
exports.getStorageByPlan = getStorageByPlan;
