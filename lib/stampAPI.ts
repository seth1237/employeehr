import api from "@/lib/api";
import { API_URL } from "./apiBase";

export interface IStamp {
  _id?: string;
  org_id?: string;
  name: string;
  description?: string;
  shape: "circle" | "rectangle" | "badge";
  text: string;
  fields: {
    date: boolean;
    user: boolean;
    stampId: boolean;
  };
  style: {
    color: string;
    opacity: number;
    rotation: number;
    fontSize?: number;
  };
  isDefault?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const stampAPI = {
  /**
   * Get all stamps for current org
   */
  async getStamps(): Promise<IStamp[]> {
    try {
      const response = await api.stamps.getAll();
      return (response?.data || response) as IStamp[] || [];
    } catch (error) {
      console.error("Failed to fetch stamps:", error);
      return [];
    }
  },

  /**
   * Get a single stamp by ID
   */
  async getStampById(stampId: string): Promise<IStamp | null> {
    try {
      const response = await api.stamps.getById(stampId);
      return (response?.data || response) as IStamp || null;
    } catch (error) {
      console.error("Failed to fetch stamp:", error);
      return null;
    }
  },

  /**
   * Get default stamp for org
   */
  async getDefaultStamp(): Promise<IStamp | null> {
    try {
      const response = await api.stamps.getDefault();
      return (response?.data || response) as IStamp || null;
    } catch (error) {
      console.error("Failed to fetch default stamp:", error);
      return null;
    }
  },

  /**
   * Create a new stamp
   */
  async createStamp(stamp: Omit<IStamp, "_id" | "createdAt" | "updatedAt">): Promise<IStamp | null> {
    try {
      const response = await api.stamps.create(stamp);
      return (response?.data || response) as IStamp || null;
    } catch (error) {
      console.error("Failed to create stamp:", error);
      return null;
    }
  },

  /**
   * Update a stamp
   */
  async updateStamp(stampId: string, updates: Partial<IStamp>): Promise<IStamp | null> {
    try {
      const response = await api.stamps.update(stampId, updates);
      return (response?.data || response) as IStamp || null;
    } catch (error) {
      console.error("Failed to update stamp:", error);
      return null;
    }
  },

  /**
   * Delete a stamp
   */
  async deleteStamp(stampId: string): Promise<boolean> {
    try {
      await api.stamps.delete(stampId);
      return true;
    } catch (error) {
      console.error("Failed to delete stamp:", error);
      return false;
    }
  },

  /**
   * Get stamp as SVG
   */
  async getStampSvg(
    stampId: string,
    date?: string,
    user?: string,
    stampIdValue?: string,
    poBox?: string,
    email?: string
  ): Promise<string> {
    try {
      const params = new URLSearchParams();
      if (date) params.append("date", date);
      if (user) params.append("user", user);
      if (stampIdValue) params.append("stampId", stampIdValue);
      if (poBox) params.append("poBox", poBox);
      if (email) params.append("email", email);

      const response = await fetch(
        `${API_URL}/api/stamps/${stampId}/svg?${params.toString()}`,
        {
          headers: {
            Accept: "image/svg+xml",
          },
        }
      );

      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.error("Failed to fetch stamp SVG:", error);
    }

    return "";
  },

  /**
   * Generate preview of stamp configuration
   */
  async generatePreview(config: any): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/api/stamps/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.error("Failed to generate preview:", error);
    }

    return "";
  },
};

export default stampAPI;
