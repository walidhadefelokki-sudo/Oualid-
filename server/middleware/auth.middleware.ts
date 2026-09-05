import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./error.middleware";
import { getJwtSecret } from "../utils/jwt";

interface JwtPayload {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    /**
     * The authenticated principal attached by `protect`.
     *
     * Declared as `Express.User` rather than by re-typing `Request.user`:
     * @types/passport owns that property and types it as `Express.User`, so a
     * competing `Request` augmentation is silently overridden and every
     * `req.user.id` in the codebase stops type-checking. Widening the User
     * interface instead means passport and our own middleware agree on one
     * shape, and no call site has to change.
     */
    interface User extends JwtPayload {}
  }
}

export const protect = (req: Request, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new AppError("Not authorized to access this route", 401));
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError("Not authorized to access this route", 401));
  }
};
