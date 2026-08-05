/**
 * DEPRECATED - StockService was tied to an outdated Prisma schema.
 *
 * The current stock implementation should be rebuilt against the generated
 * MySQL Prisma client in src/generated/prisma before being used again.
 * This file is kept only to avoid broken imports while the feature is cleaned up.
 */

export class StockService {
  static async createCategory() {
    throw new Error("StockService is deprecated and not available in the current Prisma schema.")
  }

  static async updateCategory() {
    throw new Error("StockService is deprecated and not available in the current Prisma schema.")
  }

  static async getCategories() {
    throw new Error("StockService is deprecated and not available in the current Prisma schema.")
  }

  static async getCategoryWithHierarchy() {
    throw new Error("StockService is deprecated and not available in the current Prisma schema.")
  }

  static async deleteCategory() {
    throw new Error("StockService is deprecated and not available in the current Prisma schema.")
  }

  static async createProduct() {
    throw new Error("StockService is deprecated and not available in the current Prisma schema.")
  }

  static async updateProduct() {
    throw new Error("StockService is deprecated and not available in the current Prisma schema.")
  }

  static async getProducts() {
    throw new Error("StockService is deprecated and not available in the current Prisma schema.")
  }

  static async getProduct() {
    throw new Error("StockService is deprecated and not available in the current Prisma schema.")
  }

  static async deleteProduct() {
    throw new Error("StockService is deprecated and not available in the current Prisma schema.")
  }

  static async getStockSummary() {
    throw new Error("StockService is deprecated and not available in the current Prisma schema.")
  }
}

export default StockService
