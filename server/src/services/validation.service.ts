import { type ZodSchema, ZodError } from "zod"

export class ValidationService {
  static validate<T>(data: unknown, schema: ZodSchema): T {
    try {
      return schema.parse(data) as T
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }))
        throw {
          code: "VALIDATION_ERROR",
          details: formattedErrors,
        }
      }
      throw error
    }
  }

  static safeValidate<T>(data: unknown, schema: ZodSchema): { data: T | null; errors: any[] } {
    try {
      return {
        data: schema.parse(data) as T,
        errors: [],
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          data: null,
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        }
      }
      return {
        data: null,
        errors: [{ message: "Validation failed" }],
      }
    }
  }
}
