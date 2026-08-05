/**
 * Example: How to integrate stamps into PDF documents
 * 
 * The stamp system allows you to:
 * 1. Create custom stamps with different shapes, colors, and styles
 * 2. Apply stamps to PDF documents dynamically
 * 3. Track which documents have been stamped
 * 
 * Usage Examples:
 */

// Example 1: Apply a stamp to an invoice using the text-based method
import { applyTextStampToPdf } from "@/lib/stock-document-pdf";
import { jsPDF } from "jspdf";

export function applyInvoiceStamp() {
  const doc = new jsPDF();
  
  // Your document content here...
  
  // Apply a stamp
  applyTextStampToPdf(
    doc,
    "PAID",                      // Stamp text
    150,                         // X coordinate (mm)
    100,                         // Y coordinate (mm)
    "#2ecc71",                   // Color (green)
    0.3,                         // Opacity (30%)
    -15,                         // Rotation (-15 degrees)
    48                           // Font size (48pt)
  );
  
  doc.save("invoice.pdf");
}

// Example 2: Fetch and apply a custom stamp from database
import stampAPI from "@/lib/stampAPI";
import { applyStampToPdf } from "@/lib/stock-document-pdf";

export async function applyCustomStamp(stampId: string) {
  const doc = new jsPDF();
  
  // Your document content here...
  
  // Get stamp SVG from database
  const stampSvg = await stampAPI.getStampSvg(
    stampId,
    new Date().toLocaleDateString("en-GB"),  // current date
    "John Administrator",                     // current user
    `STM-${Date.now()}`                       // stamp ID
  );
  
  // Apply stamp to PDF
  await applyStampToPdf(
    doc,
    stampSvg,
    150,            // X coordinate
    100,            // Y coordinate
    30,             // Width
    30              // Height
  );
  
  doc.save("invoice.pdf");
}

// Example 3: Integration with existing invoice generation
import api from "@/lib/api";
import { generateInvoicePdf } from "@/lib/stock-document-pdf";

export async function generateInvoiceWithStamp(invoiceData: any) {
  // Generate base PDF
  generateInvoicePdf({
    invoiceNumber: invoiceData.number,
    deliveryNoteNumber: invoiceData.deliveryNote || "",
    createdAt: invoiceData.date,
    client: invoiceData.client,
    items: invoiceData.items,
    subTotal: invoiceData.subTotal,
    preparedBy: invoiceData.preparedBy,
    watermarkText: invoiceData.status === "paid" ? "PAID" : undefined
  });
  
  // Optionally apply additional stamp
  if (invoiceData.stampId) {
    const stamp = await api.stamps.getById(invoiceData.stampId);
    if (stamp) {
      // Apply stamp using custom coordinates
      // You would need to modify the PDF generation functions to return
      // the doc object instead of saving directly
    }
  }
}

export default {
  applyInvoiceStamp,
  applyCustomStamp,
  generateInvoiceWithStamp
};
