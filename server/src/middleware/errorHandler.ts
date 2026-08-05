import type { Request, Response, NextFunction } from "express"

export interface CustomError extends Error {
  statusCode?: number
}

export const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500
  const message = err.message || "Internal server error"

  console.error(`[Error] ${statusCode}: ${message}`)

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
}
