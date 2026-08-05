import { User } from "../models/User"
import { Types } from "mongoose"
import type { IUser, IAPIResponse } from "../types/interfaces"
import { syncUserToQueue } from "../utils/queueHelper"

export class UserService {
  static async getAllUsers(org_id: string): Promise<IAPIResponse<IUser[]>> {
    try {
      const users = await User.find({ org_id }).select("-password")
      return {
        success: true,
        message: "Users fetched successfully",
        data: users.map((u) => u.toObject()),
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch users",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  static async getUserById(org_id: string, userId: string): Promise<IAPIResponse<IUser>> {
    try {
      // Validate userId is a valid MongoDB ObjectId
      if (!userId || !Types.ObjectId.isValid(userId)) {
        return {
          success: false,
          message: "Invalid user ID format",
        }
      }

      const user = await User.findOne({ _id: userId, org_id }).select("-password")

      if (!user) {
        return {
          success: false,
          message: "User not found",
        }
      }

      return {
        success: true,
        message: "User fetched successfully",
        data: user.toObject(),
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch user",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  static async updateUser(org_id: string, userId: string, data: Partial<IUser>): Promise<IAPIResponse<IUser>> {
    try {
      // Validate userId is a valid MongoDB ObjectId
      if (!userId || !Types.ObjectId.isValid(userId)) {
        return {
          success: false,
          message: "Invalid user ID format",
        }
      }

      const user = await User.findOneAndUpdate({ _id: userId, org_id }, { $set: data }, { new: true }).select(
        "-password",
      )

      if (!user) {
        return {
          success: false,
          message: "User not found",
        }
      }

      void syncUserToQueue(user.toObject(), "UPDATE")

      return {
        success: true,
        message: "User updated successfully",
        data: user.toObject(),
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to update user",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  static async getTeamMembers(org_id: string, managerId: string): Promise<IAPIResponse<IUser[]>> {
    try {
      const teamMembers = await User.find({ org_id, manager_id: managerId }).select("-password")
      return {
        success: true,
        message: "Team members fetched successfully",
        data: teamMembers.map((u) => u.toObject()),
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch team members",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  static async deleteUser(org_id: string, userId: string): Promise<IAPIResponse<null>> {
    try {
      // Validate userId is a valid MongoDB ObjectId
      if (!userId || !Types.ObjectId.isValid(userId)) {
        return {
          success: false,
          message: "Invalid user ID format",
        }
      }

      const user = await User.findOne({ _id: userId, org_id })

      if (!user) {
        return {
          success: false,
          message: "User not found",
        }
      }

      if (user.role === "company_admin") {
        return {
          success: false,
          message: "Cannot delete company admin user",
        }
      }

      const userObject = user.toObject()
      await User.deleteOne({ _id: userId, org_id })

      void syncUserToQueue(userObject, "DELETE")

      return {
        success: true,
        message: "User deleted successfully",
        data: null,
      }
    } catch (error) {
      return {
        success: false,
        message: "Failed to delete user",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}
