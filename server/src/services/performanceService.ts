import { Performance } from "../models/Performance"
import { KPI } from "../models/KPI"
import type { IPerformance, IAPIResponse } from "../types/interfaces"

export class PerformanceService {
  static async calculatePerformanceScore(org_id: string, user_id: string, period: string): Promise<number> {
    try {
      const kpis = await KPI.find({ org_id })
      const performance = await Performance.findOne({ org_id, user_id, period })

      if (!performance || !kpis.length) {
        return 0
      }

      let totalScore = 0
      let totalWeight = 0

      performance.kpi_scores.forEach((kpiScore) => {
        const kpi = kpis.find((k) => k._id.toString() === kpiScore.kpi_id)
        if (kpi) {
          totalScore += kpiScore.score * kpi.weight
          totalWeight += kpi.weight
        }
      })

      const weightedScore = totalWeight > 0 ? totalScore / totalWeight : 0

      // Factor in attendance and feedback
      const finalScore = weightedScore * 0.7 + performance.attendance_score * 0.2 + performance.feedback_score * 0.1

      return Math.round(finalScore)
    } catch (error) {
      console.error("Error calculating performance score:", error)
      return 0
    }
  }

  static async getPerformanceByPeriod(
    org_id: string,
    user_id: string,
    period: string,
  ): Promise<IAPIResponse<IPerformance>> {
    try {
      let performance = await Performance.findOne({ org_id, user_id, period })

      if (!performance) {
        performance = new Performance({
          org_id,
          user_id,
          period,
          kpi_scores: [],
          status: "pending",
        })
        await performance.save()
      }

      return {
        success: true,
        message: "Performance fetched successfully",
        data: performance.toObject(),
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch performance",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  static async updateKPIScore(
    org_id: string,
    performanceId: string,
    kpi_id: string,
    score: number,
  ): Promise<IAPIResponse<IPerformance>> {
    try {
      const performance = await Performance.findOne({ _id: performanceId, org_id })

      if (!performance) {
        return {
          success: false,
          message: "Performance record not found",
        }
      }

      const kpiIndex = performance.kpi_scores.findIndex((k) => k.kpi_id === kpi_id)

      if (kpiIndex >= 0) {
        performance.kpi_scores[kpiIndex].score = score
      } else {
        performance.kpi_scores.push({ kpi_id, score, achieved: 0, target: 0 })
      }

      performance.overall_score = await this.calculatePerformanceScore(org_id, performance.user_id, performance.period)

      await performance.save()

      return {
        success: true,
        message: "KPI score updated successfully",
        data: performance.toObject(),
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to update KPI score",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}
