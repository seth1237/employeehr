import { Request, Response } from "express";
import { StockInvoice } from "../models/StockInvoice";
import { CustomerDeliveryFeedback } from "../models/CustomerDeliveryFeedback";

export class DeliveryFeedbackController {
  static async getDeliveryDetailsForFeedback(req: Request, res: Response) {
    try {
      const { invoiceId } = req.params;
      const invoice = await StockInvoice.findById(invoiceId)
        .select("invoiceNumber deliveryNoteNumber client dispatch.status dispatch.delivery")
        .lean();
        
      if (!invoice) {
        return res.status(404).json({ success: false, message: "Delivery record not found" });
      }

      // Allow feedback even if status is not 'delivered' in case it's slightly out of sync, 
      // but ideally it should be delivered.
      
      const existingFeedback = await CustomerDeliveryFeedback.findOne({ invoiceId: invoice._id });
      if (existingFeedback) {
        return res.status(400).json({ success: false, message: "Feedback already submitted for this delivery", data: { alreadySubmitted: true } });
      }

      return res.status(200).json({
        success: true,
        data: {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.client?.name,
          deliveryNoteNumber: invoice.deliveryNoteNumber,
        }
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async submitFeedback(req: Request, res: Response) {
    try {
      const { invoiceId } = req.params;
      const { productRating, serviceRating, areasOfImprovement, wouldRecommend, comments } = req.body;

      if (!productRating || !serviceRating) {
        return res.status(400).json({ success: false, message: "Ratings are required" });
      }

      const invoice = await StockInvoice.findById(invoiceId).lean();
      if (!invoice) {
        return res.status(404).json({ success: false, message: "Delivery record not found" });
      }

      const existingFeedback = await CustomerDeliveryFeedback.findOne({ invoiceId: invoice._id });
      if (existingFeedback) {
        return res.status(400).json({ success: false, message: "Feedback already submitted" });
      }

      const feedback = await CustomerDeliveryFeedback.create({
        org_id: invoice.org_id,
        invoiceId: String(invoice._id),
        invoiceNumber: invoice.invoiceNumber,
        clientId: invoice.clientProfileId,
        clientName: invoice.client?.name || "Unknown",
        productRating: Number(productRating),
        serviceRating: Number(serviceRating),
        areasOfImprovement: Array.isArray(areasOfImprovement) ? areasOfImprovement : [],
        wouldRecommend: typeof wouldRecommend === 'boolean' ? wouldRecommend : undefined,
        comments: comments ? String(comments).trim() : "",
      });

      return res.status(201).json({ success: true, data: feedback });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
