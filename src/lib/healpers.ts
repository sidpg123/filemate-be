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
