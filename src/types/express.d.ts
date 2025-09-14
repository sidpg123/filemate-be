import { Request } from "express";

export interface AuthenticatedRequest extends Request {
    user?: {
    id: string;
    sub: string;
    role: string;
    // type: string;
  };
}