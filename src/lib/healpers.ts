import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/express";

const TryCatch = (passedFunc: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await passedFunc(req, res, next);
    } catch (error) {
      next(error);
    }
  };

export default TryCatch;

const thumbnailMap: Record<string, string> = {
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
}

export const getThumbnailImageKey = (fileType: string): string => {
  return thumbnailMap[fileType] || '/thumbnails/default.png';
};


const planToStorageMap: Record<string, bigint> = {
  "1y" : BigInt(10 * 1024 * 1024 * 1024), //10GB
  "6m" : BigInt(10 * 1024 * 1024 * 1024), //10GB
  "extra5GB" : BigInt(5 * 1024 * 1024 * 1024), //5GB
}

export const getStorageByPlan = (plan: string): bigint => {
  return planToStorageMap[plan]
}