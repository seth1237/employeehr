import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export class SecondaryStorageService {
  // Sync user from MongoDB to MySQL
  static async syncUserToMySQL(mongoUser: any, action: "CREATE" | "UPDATE" | "DELETE") {
    try {
      const mongoId = mongoUser._id.toString()

      if (action === "DELETE") {
        await prisma.user.deleteMany({ where: { mongoId } })
        return
      }

      const userData = {
        mongoId,
        org_id: mongoUser.org_id,
        email: mongoUser.email.toLowerCase(),
        firstName: mongoUser.firstName,
        lastName: mongoUser.lastName,
        role: mongoUser.role,
        status: mongoUser.status,
        employee_id: mongoUser.employee_id || null,
        password: mongoUser.password,
        phone: mongoUser.phone || null,
        department: mongoUser.department || null,
        manager_id: mongoUser.manager_id || null,
        profileImage: mongoUser.profileImage || mongoUser.avatar || null,
        isActive: mongoUser.isActive ?? true,
      }

      await prisma.user.upsert({
        where: { mongoId },
        create: userData as any,
        update: userData as any,
      })

      console.log(`✅ User synced to MySQL: ${mongoUser.email}`)
    } catch (error) {
      console.error("❌ Failed to sync user to MySQL:", error)
      throw error
    }
  }

  // Sync company from MongoDB to MySQL
  static async syncCompanyToMySQL(mongoCompany: any, action: "CREATE" | "UPDATE" | "DELETE") {
    try {
      const mongoId = mongoCompany._id.toString()

      if (action === "DELETE") {
        await prisma.company.deleteMany({ where: { mongoId } })
        return
      }

      const companyData = {
        mongoId,
        name: mongoCompany.name,
        slug: mongoCompany.slug,
        email: mongoCompany.email,
        phone: mongoCompany.phone || null,
        website: mongoCompany.website || null,
        industry: mongoCompany.industry || null,
        employeeCount: mongoCompany.employeeCount || null,
        status: mongoCompany.status || "active",
        isFrozen: mongoCompany.isFrozen ?? false,
        primaryColor: mongoCompany.primaryColor || "#667eea",
        secondaryColor: mongoCompany.secondaryColor || "#764ba2",
        logo: mongoCompany.logo || null,
      }

      await prisma.company.upsert({
        where: { mongoId },
        create: companyData as any,
        update: companyData as any,
      })

      console.log(`✅ Company synced to MySQL: ${mongoCompany.name}`)
    } catch (error) {
      console.error("❌ Failed to sync company to MySQL:", error)
      throw error
    }
  }

  // Log audit trail
  static async logAuditTrail(
    userId: string,
    orgId: string,
    entity: string,
    action: string,
    entityId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          orgId,
          entityType: entity,
          action,
          entityId,
          changes: oldValues || newValues
            ? {
                oldValues: oldValues || null,
                newValues: newValues || null,
              }
            : undefined,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      })
    } catch (error) {
      console.error("❌ Failed to log audit trail:", error)
      // Don't throw - audit failures shouldn't break the main operation
    }
  }

  // Create or update session
  static async createSession(_userId: string, _org_id: string, _token: string, _expiresAt: Date, _ipAddress?: string, _userAgent?: string) {
    console.warn("⚠️ Session storage is deprecated in the MySQL layer and is currently a no-op.")
    return null
  }

  // Get user from MySQL (for faster reads/caching)
  static async getUserByEmail(email: string) {
    try {
      return await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    } catch (error) {
      console.error("❌ Failed to get user from MySQL:", error)
      return null
    }
  }

  // Get company from MySQL (for faster reads)
  static async getCompanyBySlug(slug: string) {
    try {
      return await prisma.company.findUnique({ where: { slug } })
    } catch (error) {
      console.error("❌ Failed to get company from MySQL:", error)
      return null
    }
  }

  // Record analytics snapshot
  static async recordAnalyticsSnapshot(_org_id: string, _metrics: Record<string, any>) {
    console.warn("⚠️ Analytics snapshot storage is deprecated in the MySQL layer and is currently a no-op.")
    return null
  }

  // Clean up old sessions
  static async cleanExpiredSessions() {
    console.warn("⚠️ Session cleanup is deprecated in the MySQL layer and is currently a no-op.")
    return 0
  }

  // Disconnect Prisma
  static async disconnect() {
    await prisma.$disconnect()
  }
}

export default SecondaryStorageService
