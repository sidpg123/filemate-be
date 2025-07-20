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
  doc: 'public/thumbnails/docx.png',
  docx: 'public/thumbnails/docx.png',
  xls: 'public/thumbnails/xlsx.png',
  xlsx: 'public/thumbnails/xlsx.png',
  ppt: 'public/thumbnails/pptx.png',
  pptx: 'public/thumbnails/pptx.png',
  txt: 'public/thumbnails/txt.png',
  csv: 'public/thumbnails/csv.png',
  json: 'public/thumbnails/json.png',
  zip: 'public/thumbnails/zip.png',
  rar: 'public/thumbnails/rar.png',
  // pdf: 'public/thumbnails/pdf.png',
}

export const getThumbnailImageKey = (fileType: string): string => {
  return thumbnailMap[fileType] || 'public/thumbnails/default.png';
};