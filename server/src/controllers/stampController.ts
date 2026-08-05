import { Request, Response } from "express";
import Stamp, { IStamp } from "../models/Stamp";
import {
  generateStampSVG,
  generateStampPreviewSVG,
  validateStampConfig,
} from "../utils/stampGenerator";
import { AuthenticatedRequest } from "../middleware/auth";

class StampController {
  /**
   * Get all stamps for tenant
   */
  static async getStamps(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id;

      if (!org_id) {
        return res.status(400).json({ message: "Organization ID is required" });
      }

      const stamps = await Stamp.find({ org_id }).sort({ createdAt: -1 });

      return res.status(200).json(stamps);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error fetching stamps", error: String(error) });
    }
  }

  /**
   * Get single stamp by ID
   */
  static async getStampById(req: AuthenticatedRequest, res: Response) {
    try {
      const { stampId } = req.params;
      const org_id = req.org_id;

      const stamp = await Stamp.findOne({ _id: stampId, org_id });

      if (!stamp) {
        return res.status(404).json({ message: "Stamp not found" });
      }

      return res.status(200).json(stamp);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error fetching stamp", error: String(error) });
    }
  }

  /**
   * Create new stamp
   */
  static async createStamp(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        name,
        description,
        template,
        svgTemplate,
        shape,
        text,
        fields,
        style,
        isDefault,
      } = req.body;
      const org_id = req.org_id || req.user?.org_id || req.body.org_id;

      if (!org_id) {
        return res.status(400).json({ message: "Organization ID is required" });
      }

      // Validate inputs
      const stampData = {
        name,
        shape,
        text,
        fields,
        style,
      };

      const validationErrors = validateStampConfig(stampData);
      if (validationErrors.length > 0) {
        return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
      }

      // If setting as default, unset other defaults
      if (isDefault) {
        await Stamp.updateMany({ org_id }, { isDefault: false });
      }

      const stamp = new Stamp({
        org_id,
        name,
        description: description || "",
        template: template || "standard",
        svgTemplate: svgTemplate || "",
        shape,
        text,
        fields,
        style,
        isDefault: isDefault || false,
        createdBy: req.user?.userId || req.body.createdBy || "system",
      });

      await stamp.save();

      return res.status(201).json(stamp);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({
          message: "Error creating stamp",
          error: error.message,
        });
      }
      return res
        .status(500)
        .json({ message: "Error creating stamp", error: String(error) });
    }
  }

  /**
   * Update stamp
   */
  static async updateStamp(req: AuthenticatedRequest, res: Response) {
    try {
      const { stampId } = req.params;
      const {
        name,
        description,
        template,
        svgTemplate,
        shape,
        text,
        fields,
        style,
        isDefault,
      } = req.body;
      const org_id = req.org_id || req.user?.org_id || req.body.org_id;

      if (!org_id) {
        return res.status(400).json({ message: "Organization ID is required" });
      }

      // Validate inputs
      const stampData = {
        name,
        shape,
        text,
        fields,
        style,
      };

      const validationErrors = validateStampConfig(stampData);
      if (validationErrors.length > 0) {
        return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
      }

      // If setting as default, unset other defaults
      if (isDefault) {
        await Stamp.updateMany({ org_id, _id: { $ne: stampId } }, { isDefault: false });
      }

      const stamp = await Stamp.findOneAndUpdate(
        { _id: stampId, org_id },
        {
          name,
          description: description || "",
          template: template || "standard",
          svgTemplate: svgTemplate || "",
          shape,
          text,
          fields,
          style,
          isDefault: isDefault || false,
        },
        { new: true }
      );

      if (!stamp) {
        return res.status(404).json({ message: "Stamp not found" });
      }

      return res.status(200).json(stamp);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error updating stamp", error: String(error) });
    }
  }

  /**
   * Delete stamp
   */
  static async deleteStamp(req: AuthenticatedRequest, res: Response) {
    try {
      const { stampId } = req.params;
      const org_id = req.org_id;

      const stamp = await Stamp.findOneAndDelete({ _id: stampId, org_id });

      if (!stamp) {
        return res.status(404).json({ message: "Stamp not found" });
      }

      return res.status(200).json({ message: "Stamp deleted successfully" });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error deleting stamp", error: String(error) });
    }
  }

  /**
   * Generate preview SVG for stamp
   */
  static async generatePreview(req: Request, res: Response) {
    try {
      const { shape, text, fields, style } = req.body;

      const stamp: Partial<IStamp> = {
        shape: shape as "circle" | "rectangle" | "badge",
        text,
        fields,
        style,
      };

      const svg = generateStampPreviewSVG(stamp);

      return res
        .status(200)
        .setHeader("Content-Type", "image/svg+xml")
        .send(svg);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error generating preview", error: String(error) });
    }
  }

  /**
   * Get default stamp for tenant
   */
  static async getDefaultStamp(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id;

      const defaultStamp = await Stamp.findOne({ org_id, isDefault: true });

      if (!defaultStamp) {
        // Return first stamp if no default
        const firstStamp = await Stamp.findOne({ org_id });
        return res.status(200).json(firstStamp || null);
      }

      return res.status(200).json(defaultStamp);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error fetching default stamp", error: String(error) });
    }
  }

  /**
   * Get stamp SVG with values
   */
  static async getStampSVG(req: AuthenticatedRequest, res: Response) {
    try {
      const { stampId } = req.params;
      const org_id = req.org_id;
      const { date, user, stampId: stampIdValue, poBox, email } = req.query;

      const stamp = await Stamp.findOne({ _id: stampId, org_id });

      if (!stamp) {
        return res.status(404).json({ message: "Stamp not found" });
      }

      const svg = generateStampSVG(stamp, {
        date: date as string,
        user: user as string,
        stampId: stampIdValue as string,
        poBox: poBox as string,
        email: email as string,
      });

      return res
        .status(200)
        .setHeader("Content-Type", "image/svg+xml")
        .send(svg);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error generating stamp SVG", error: String(error) });
    }
  }
}

export default StampController;
