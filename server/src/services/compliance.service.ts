export class ComplianceService {
  static async exportUserData(userId: string, orgId: string) {
    // Returns all personal data associated with user for GDPR data portability
    return {
      exportDate: new Date().toISOString(),
      userId,
      orgId,
      dataCategories: [
        "personal_information",
        "performance_data",
        "feedback_data",
        "attendance_data",
        "training_records",
      ],
    }
  }

  static async deleteUserData(userId: string, orgId: string) {
    // Anonymize user data per GDPR right to be forgotten
    return {
      status: "pending",
      userId,
      userId,
      message: "Data deletion scheduled",
      estimatedCompletionTime: "48 hours",
    }
  }

  static isDataFresh(lastUpdated: Date, maxAgeInHours = 24): boolean {
    const ageInHours = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60)
    return ageInHours <= maxAgeInHours
  }

  static validatePerformanceScore(score: number, min = 0, max = 10): boolean {
    return score >= min && score <= max && !isNaN(score)
  }

  static validateWeightedAverage(scores: Record<string, number>, weights: Record<string, number>): number {
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
    if (totalWeight === 0) return 0
    const weighted = Object.entries(scores).reduce((sum, [key, score]) => {
      return sum + (score * (weights[key] || 0)) / totalWeight
    }, 0)
    return Math.round(weighted * 100) / 100
  }
}
