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
  "e77dbc82-7325-4823-b3bc-1e8d4675946c" : BigInt(10 * 1024 * 1024 * 1024), //10GB
  "83f76a56-bf26-4d93-920e-31f9b6e425fd" : BigInt(10 * 1024 * 1024 * 1024), //10GB
  "925463d3-b270-45b5-8974-944427991663" : BigInt(5 * 1024 * 1024 ), //500 MB
}

export const getStorageByPlan = (plan: string): bigint => {
  return planToStorageMap[plan]
}