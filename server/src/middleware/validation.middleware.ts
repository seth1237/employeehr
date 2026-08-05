import type { Request, Response, NextFunction } from "express"
import type { ZodSchema } from "zod"
import { ValidationService } from "../services/validation.service"

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { data, errors } = ValidationService.safeValidate(req.body, schema)

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        errors,
      })
    }

    req.body = data
    next()
  }
}

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { data, errors } = ValidationService.safeValidate(req.query, schema)

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        errors,
      })
    }

    req.query = data as any
    next()
  }
}
