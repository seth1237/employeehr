import { jsPDF } from "jspdf";
import API_URL from "./apiBase";

export interface TenantBranding {
  name?: string;
  logo?: string; // base64 or url
  primaryColor?: string;
  secondaryColor?: string;
  invoiceEmail?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface InvoiceDocumentSettings {
  invoiceEmail?: string;
  contactPhone?: string;
  officeLocation?: string;
  secondLocation?: string;
  useBothLocations?: boolean;
  contactEmail?: string;
  website?: string;
  vatNumber?: string;
  pinNumber?: string;
  termsAndConditions?: string;
  includeQuotationReference?: boolean;
  includeDeliveryNoteNumber?: boolean;
  includePreparedBy?: boolean;
  includeVat?: boolean;
  includePaymentChannels?: boolean;
  paymentChannels?: Array<{
    paymentType?: string;
    mpesaMode?: string;
    channelName?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    paybillNumber?: string;
    tillNumber?: string;
    branch?: string;
    notes?: string;
  }>;
}

export interface DocumentClient {
  name: string;
  number: string; // phone
  location: string;
}

export interface DocumentItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  taxRate?: number;
  totalAfterTax?: number;
  description?: string;
  imageUrl?: string;
  showImageOnQuote?: boolean;
}

interface HeaderArgs {
  title: string;
  numberLabel: string;
  numberValue: string;
  createdAt: string;
  branding?: TenantBranding;
}

const DEFAULT_PRIMARY = "#0f766e"; // teal - modern & professional
const DEFAULT_SECONDARY = "#14b8a6";
const DEFAULT_TEXT = "#1f2937";
const DEFAULT_LIGHT = "#f1f5f9";
const DEFAULT_GRAY = "#6b7280";

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 };
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function setColorFromHex(
  doc: jsPDF,
  hex: string,
  kind: "fill" | "text" | "draw",
) {
  const { r, g, b } = hexToRgb(hex);
  if (kind === "fill") doc.setFillColor(r, g, b);
  if (kind === "text") doc.setTextColor(r, g, b);
  if (kind === "draw") doc.setDrawColor(r, g, b);
}

function formatKsh(value: number): string {
  return `KSh ${value.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatAmount(value: number): string {
  return value.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function drawThinDivider(doc: jsPDF, y: number, colorHex = "#e2e8f0") {
  setColorFromHex(doc, colorHex, "draw");
  doc.setLineWidth(0.4);
  doc.line(12, y, 198, y);
}

function drawWatermark(doc: jsPDF, value?: string) {
  if (!value) return;
  doc.setTextColor(220, 220, 220);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(48);
  doc.text(value.toUpperCase(), 105, 150, { angle: 45, align: "center" });
}

function buildCompanyAddress(branding?: TenantBranding): string {
  const parts = [branding?.city, branding?.state, branding?.country].filter(
    Boolean,
  );
  return parts.length ? parts.join(", ") : "";
}

function drawModernHeader(doc: jsPDF, args: HeaderArgs) {
  const primary = args.branding?.primaryColor || DEFAULT_PRIMARY;
  const hasLogo = Boolean(args.branding?.logo);

  const logoX = 12;
  const logoY = 12;

  // Logo
  if (hasLogo) {
    try {
      const lower = args.branding!.logo!.toLowerCase();
      const format =
        lower.includes("jpg") || lower.includes("jpeg") ? "JPEG" : "PNG";
      const maxLogoWidth = 44;
      const maxLogoHeight = 20;
      let imageWidth = 0;
      let imageHeight = 0;

      try {
        const imageProps = doc.getImageProperties(args.branding!.logo!);
        imageWidth = Number(imageProps?.width || 0);
        imageHeight = Number(imageProps?.height || 0);
      } catch {
        imageWidth = 3;
        imageHeight = 1;
      }

      let drawWidth = maxLogoWidth;
      let drawHeight = maxLogoHeight;

      if (imageWidth > 0 && imageHeight > 0) {
        const ratio = imageWidth / imageHeight;
        if (ratio >= 1) {
          drawWidth = maxLogoWidth;
          drawHeight = Math.min(maxLogoHeight, drawWidth / ratio);
        } else {
          drawHeight = maxLogoHeight;
          drawWidth = Math.min(maxLogoWidth, drawHeight * ratio);
        }
      }

      const alignedY = logoY + (maxLogoHeight - drawHeight) / 2;
      doc.addImage(
        args.branding!.logo!,
        format,
        logoX,
        alignedY,
        drawWidth,
        drawHeight,
      );
    } catch (e) {
      console.warn("Logo failed to load", e);
    }
  }

  // Document title - right side (larger, more prominent)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  setColorFromHex(doc, primary, "text");
  doc.text(args.title.toUpperCase(), 198, 25, { align: "right" });

  // Invoice details - right side (plain, no box)
  const metaX = 106;
  const metaY = 38;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  doc.text(args.numberLabel, metaX, metaY);
  doc.text("Issued", metaX, metaY + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text(args.numberValue, 198, metaY, { align: "right" });
  doc.text(
    new Date(args.createdAt).toLocaleDateString("en-KE"),
    198,
    metaY + 12,
    { align: "right" },
  );

  drawThinDivider(doc, 68);
}

function drawContactSlotBelowLogo(
  doc: jsPDF,
  branding?: TenantBranding,
  settings?: InvoiceDocumentSettings,
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY;
  const phone = String(settings?.contactPhone || branding?.phone || "").trim();
  const location = String(
    settings?.officeLocation || buildCompanyAddress(branding) || "",
  ).trim();
  const secondLocation = String(settings?.secondLocation || "").trim();
  const email = String(
    settings?.contactEmail || settings?.invoiceEmail || branding?.email || "",
  ).trim();
  const website = String(settings?.website || branding?.website || "").trim();
  const vatNumber = String(settings?.vatNumber || "").trim();
  const pinNumber = String(settings?.pinNumber || "").trim();
  const useBothLocations = Boolean(settings?.useBothLocations);

  const rows = [
    { label: "Phone", value: phone },
    { label: "Email", value: email },
    { label: "Website", value: website },
    ...(useBothLocations && secondLocation
      ? [
          { label: "Main Office", value: location },
          { label: "Branch", value: secondLocation },
        ]
      : [{ label: "Address", value: location }]),
    { label: "VAT", value: vatNumber },
    ...(useBothLocations ? [] : [{ label: "PIN", value: pinNumber }]),
  ].filter((row) => row.value);

  if (!rows.length) return 68;

  const boxX = 12;
  const boxY = 38;
  const rowHeight = 3.8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  setColorFromHex(doc, DEFAULT_GRAY, "text");

  let y = boxY;
  rows.forEach((row) => {
    const wrapped = doc.splitTextToSize(row.value, 82);
    doc.text(`${row.label}: ${wrapped[0] || ""}`, boxX, y);
    y += rowHeight;
  });

  return y + 2;
}

function drawPartiesSection(
  doc: jsPDF,
  client: DocumentClient,
  preparedBy?: string,
  branding?: TenantBranding,
  rightTitle = "Payment Terms",
  startY = 90,
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY;
  const leftX = 12;
  const rightX = 106;
  const boxY = Math.max(startY, 72);
  const boxW = 92;

  const headerH = 6.5;
  const lineH = 4;
  const padX = 3.5;
  const padY = 3;

  const nameLines = doc.splitTextToSize(client.name || "Client Name", 84);
  const preparedLines = preparedBy
    ? doc.splitTextToSize(`Prepared by: ${preparedBy}`, 84)
    : [];
  const companyLines = doc.splitTextToSize(
    `Company: ${branding?.name || "—"}`,
    84,
  );
  const contact = branding?.phone || branding?.email || "—";
  const contactLines = doc.splitTextToSize(`Contact: ${contact}`, 84);

  const leftContentLines = nameLines.length + 2;
  const rightContentLines =
    companyLines.length + contactLines.length + (preparedLines.length || 0);
  const leftHeight = headerH + padY + leftContentLines * lineH + 1;
  const rightHeight = headerH + padY + rightContentLines * lineH + 1;
  const boxH = Math.max(leftHeight, rightHeight, headerH + 12);

  setColorFromHex(doc, primary, "draw");
  doc.setLineWidth(0.35);
  doc.rect(leftX, boxY, boxW, boxH);
  doc.rect(rightX, boxY, boxW, boxH);
  setColorFromHex(doc, DEFAULT_LIGHT, "fill");
  doc.rect(leftX, boxY, boxW, headerH, "F");
  doc.rect(rightX, boxY, boxW, headerH, "F");
  doc.line(leftX, boxY + headerH, leftX + boxW, boxY + headerH);
  doc.line(rightX, boxY + headerH, rightX + boxW, boxY + headerH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text("Bill To", leftX + padX, boxY + 4.5);
  doc.text(rightTitle, rightX + padX, boxY + 4.5);

  let ly = boxY + headerH + padY + 2.8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text(nameLines, leftX + padX, ly);
  ly += nameLines.length * lineH;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  doc.text(`Phone: ${client.number || "—"}`, leftX + padX, ly);
  ly += lineH;
  doc.text(`Location: ${client.location || "—"}`, leftX + padX, ly);

  let ry = boxY + headerH + padY + 2.8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  if (preparedLines.length) {
    doc.text(preparedLines, rightX + padX, ry);
    ry += preparedLines.length * lineH;
  }
  doc.text(companyLines, rightX + padX, ry);
  ry += companyLines.length * lineH;
  doc.text(contactLines, rightX + padX, ry);

  return boxY + boxH + 2.5;
}

function drawItemsTable(
  doc: jsPDF,
  startY: number,
  items: DocumentItem[],
  branding?: TenantBranding,
  compact = false,
  includeTax = false,
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY;
  const tableX = 12;
  const tableWidth = 186;
  const headerHeight = 11;
  const baseRowHeight = 10.5; // row height when no description
  const descLineH = 3; // line height for description text

  const columns = compact
    ? [
        { key: "index", label: "#", width: 14, align: "left" as const },
        {
          key: "description",
          label: "Description",
          width: 128,
          align: "left" as const,
        },
        { key: "quantity", label: "Qty", width: 44, align: "right" as const },
      ]
    : includeTax
      ? [
          { key: "index", label: "#", width: 12, align: "left" as const },
          {
            key: "description",
            label: "Description",
            width: 76,
            align: "left" as const,
          },
          { key: "quantity", label: "Qty", width: 16, align: "right" as const },
          {
            key: "unitPrice",
            label: "Unit Price (KSh)",
            width: 34,
            align: "right" as const,
          },
          { key: "tax", label: "Tax %", width: 18, align: "right" as const },
          {
            key: "totalAfterTax",
            label: "Total",
            width: 30,
            align: "right" as const,
          },
        ]
      : [
          { key: "index", label: "#", width: 12, align: "left" as const },
          {
            key: "description",
            label: "Description",
            width: 98,
            align: "left" as const,
          },
          { key: "quantity", label: "Qty", width: 18, align: "right" as const },
          {
            key: "unitPrice",
            label: "Unit Price (KSh)",
            width: 34,
            align: "right" as const,
          },
          { key: "total", label: "Total", width: 24, align: "right" as const },
        ];

  const columnStartX = columns.map((_, index) => {
    return (
      tableX + columns.slice(0, index).reduce((sum, c) => sum + c.width, 0)
    );
  });

  // Pre-compute description lines for each item so we know the row height
  const descColWidth = columns[1].width - 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  const itemDescLines: string[][] = items.map((item) => {
    if (!item.description) return [];
    return doc.splitTextToSize(item.description, descColWidth) as string[];
  });
  // Reset font
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const getRowHeight = (index: number) => {
    const item = items[index];
    const lines = itemDescLines[index];
    let h = baseRowHeight;
    if (lines && lines.length > 0) {
      h = Math.max(h, 10 + lines.length * descLineH + 2);
    }
    if (item.showImageOnQuote && item.imageUrl) {
      h = Math.max(h, 22); // minimum height if image is shown
    }
    return h;
  };

  const drawTableHeader = (headerY: number) => {
    setColorFromHex(doc, primary, "fill");
    doc.rect(tableX, headerY, tableWidth, headerHeight, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);

    columns.forEach((column, index) => {
      const startX = columnStartX[index];
      const endX = startX + column.width;
      if (column.key === "unitPrice") {
        doc.text("Unit Price (KSh)", endX - 3, headerY + 8.5, {
          align: "right",
        });
      } else if (column.align === "right") {
        doc.text(column.label, endX - 3, headerY + 8.5, { align: "right" });
      } else {
        doc.text(column.label, startX + 3, headerY + 8.5);
      }
    });

    setColorFromHex(doc, primary, "draw");
    doc.setLineWidth(0.45);
    doc.rect(tableX, headerY, tableWidth, headerHeight);
    columns.forEach((_, index) => {
      if (index === 0) return;
      const x = columnStartX[index];
      doc.line(x, headerY, x, headerY + headerHeight);
    });
  };

  const drawRowGrid = (rowY: number, rh: number) => {
    setColorFromHex(doc, primary, "draw");
    doc.setLineWidth(0.35);
    doc.rect(tableX, rowY, tableWidth, rh);
    columns.forEach((_, index) => {
      if (index === 0) return;
      const x = columnStartX[index];
      doc.line(x, rowY, x, rowY + rh);
    });
  };

  let y = startY;
  drawTableHeader(y);

  y += headerHeight;

  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  items.forEach((item, i) => {
    const rh = getRowHeight(i);

    if (y + rh > 270) {
      doc.addPage();
      y = 20;
      drawTableHeader(y);
      y += headerHeight;
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }

    // Light row stripe
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, y, tableWidth, rh, "F");
    }

    drawRowGrid(y, rh);

    const maxNameLength = compact ? 76 : includeTax ? 48 : 62;
    const name =
      item.productName.length > maxNameLength
        ? item.productName.slice(0, maxNameLength - 3) + "..."
        : item.productName;

    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(String(i + 1).padStart(2, "0"), columnStartX[0] + 2, y + 7);

    let textX = columnStartX[1] + 3;
    if (item.showImageOnQuote && item.imageUrl) {
      try {
        const fullUrl = item.imageUrl.startsWith("http")
          ? item.imageUrl
          : `${API_URL}${item.imageUrl}`;
        doc.addImage(fullUrl, "WEBP", textX, y + 2, 12, 12);
        textX += 15;
      } catch (e) {
        console.warn("Failed to add image to PDF", e);
      }
    }

    doc.text(name, textX, y + 7);

    // Render description lines below the product name
    const descLines = itemDescLines[i];
    if (descLines && descLines.length > 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      setColorFromHex(doc, DEFAULT_GRAY, "text");

      let descY = y + 11;
      // if image was shown, shift description down if needed or keep same X
      descLines.forEach((line: string) => {
        doc.text(`• ${line}`, textX + 2, descY);
        descY += descLineH;
      });

      // Restore
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
    }

    if (compact) {
      const qtyCol = columns[2];
      doc.text(
        String(item.quantity),
        tableX + qtyCol.width + columns[0].width + columns[1].width - 2,
        y + 7,
        { align: "right" },
      );
    } else if (includeTax) {
      const taxRate = Number(item.taxRate || 0);
      const baseTotal = Number(item.lineTotal || 0);
      const totalAfterTax = Number(
        item.totalAfterTax || baseTotal + baseTotal * (taxRate / 100),
      );

      doc.text(
        String(item.quantity),
        columnStartX[2] + columns[2].width - 3,
        y + 7,
        { align: "right" },
      );
      doc.text(
        formatAmount(item.unitPrice),
        columnStartX[3] + columns[3].width - 3,
        y + 7,
        { align: "right" },
      );
      doc.text(
        `${taxRate.toFixed(2)}%`,
        columnStartX[4] + columns[4].width - 3,
        y + 7,
        { align: "right" },
      );
      doc.text(
        formatAmount(totalAfterTax),
        columnStartX[5] + columns[5].width - 3,
        y + 7,
        { align: "right" },
      );
    } else {
      doc.text(
        String(item.quantity),
        columnStartX[2] + columns[2].width - 3,
        y + 7,
        { align: "right" },
      );
      doc.text(
        formatAmount(item.unitPrice),
        columnStartX[3] + columns[3].width - 3,
        y + 7,
        { align: "right" },
      );
      doc.text(
        formatAmount(item.lineTotal),
        columnStartX[4] + columns[4].width - 3,
        y + 7,
        { align: "right" },
      );
    }

    y += rh;
  });

  return y + 6;
}

function drawTotalsSection(
  doc: jsPDF,
  subtotal: number,
  startY: number,
  branding?: TenantBranding,
  settings?: InvoiceDocumentSettings,
  skipAutoPageBreak = false,
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY;
  const showVat = Boolean(settings?.includeVat === true);
  const vat = showVat ? subtotal * 0.16 : 0;
  const grandTotal = subtotal + vat;

  const rowH = 7;
  const rows = showVat ? 3 : 2;
  const boxH = rows * rowH + 3;

  let y = startY + 6;
  // Only auto-break if the caller hasn't already guaranteed placement
  // (skipAutoPageBreak=true is used when the position was pre-computed,
  // e.g. tender totals pinned to the bottom of the current page).
  if (!skipAutoPageBreak && y + boxH > 280) {
    doc.addPage();
    y = 20;
  }

  const boxX = 115;
  const boxW = 83;
  const splitX = boxX + 48;

  // Totals table with better spacing and hierarchy
  doc.setFillColor(255, 255, 255);
  setColorFromHex(doc, primary, "draw");
  doc.setLineWidth(0.45);
  doc.rect(boxX, y, boxW, boxH, "FD");
  doc.line(splitX, y, splitX, y + boxH);
  for (let i = 1; i < rows; i += 1) {
    doc.line(boxX, y + i * rowH, boxX + boxW, y + i * rowH);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  // Ensure text color is dark/readable (not white from header)
  setColorFromHex(doc, DEFAULT_TEXT, "text");

  const labelX = boxX + 4;
  const valueX = boxX + boxW - 4;
  let rowY = y + 4.8;

  doc.text("Subtotal", labelX, rowY);
  doc.text(formatAmount(subtotal), valueX, rowY, { align: "right" });

  if (showVat) {
    rowY += rowH;
    doc.text("VAT (16%)", labelX, rowY);
    doc.text(formatAmount(vat), valueX, rowY, { align: "right" });
  }

  rowY = y + rowH * (rows - 1) + 4.8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text("Grand Total", labelX, rowY);
  doc.text(formatAmount(grandTotal), valueX, rowY, { align: "right" });

  return y + boxH + 4;
}

function drawBottomFooter(
  doc: jsPDF,
  branding?: TenantBranding,
  settings?: InvoiceDocumentSettings,
  preparedBy?: string,
) {
  const footerY = 287;
  drawThinDivider(doc, footerY - 5, "#cbd5e1");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  doc.text("System build and managed by codewithseth.co.ke", 105, footerY, {
    align: "center",
  });
}

function drawTermsAndPaymentChannelsSection(
  doc: jsPDF,
  startY: number,
  settings?: InvoiceDocumentSettings,
  branding?: TenantBranding,
) {
  const availableBottom = 284;
  const y = availableBottom - 22;
  const terms = String(settings?.termsAndConditions || "").trim();
  const channels = Array.isArray(settings?.paymentChannels)
    ? settings!.paymentChannels
    : [];

  if (
    !terms &&
    !(settings?.includePaymentChannels !== false && channels.length)
  ) {
    return y;
  }

  const leftX = 12;
  const rightX = 105;
  const lineH = 3.2;
  const colW = 91;

  // Small compact header for terms
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text("Terms & Conditions", leftX, y);
  doc.text("Payment Channels", rightX, y);

  let ty = y + 3.5;

  // Terms content - compact
  if (terms) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setColorFromHex(doc, DEFAULT_GRAY, "text");
    const termsLines = doc.splitTextToSize(terms, colW - 2);
    termsLines.slice(0, 3).forEach((line: string) => {
      doc.text(line, leftX, ty);
      ty += lineH;
    });
  }

  // Payment channels content - compact
  let cy = y + 3.5;
  if (settings?.includePaymentChannels !== false && channels.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setColorFromHex(doc, DEFAULT_GRAY, "text");
    channels.slice(0, 2).forEach((channel) => {
      const isMpesa =
        String(channel.paymentType || "").toLowerCase() === "mpesa" ||
        /mpesa/i.test(`${channel.channelName || ""} ${channel.bankName || ""}`);
      const mpesaMode = String(channel.mpesaMode || "").toLowerCase();
      const title =
        channel.channelName ||
        channel.bankName ||
        (isMpesa ? "M-Pesa" : "Payment Channel");
      doc.text(title, rightX, cy);
      cy += lineH;
      if (isMpesa) {
        if (
          (mpesaMode === "paybill" || channel.paybillNumber) &&
          channel.paybillNumber
        ) {
          doc.text(`Paybill: ${channel.paybillNumber}`, rightX, cy);
          cy += lineH;
        }
        if (channel.accountNumber) {
          doc.text(`Account No: ${channel.accountNumber}`, rightX, cy);
          cy += lineH;
        }
        if (mpesaMode === "till" || channel.tillNumber) {
          const till = channel.tillNumber || channel.accountNumber;
          if (till) {
            doc.text(`Till No: ${till}`, rightX, cy);
            cy += lineH;
          }
        }
      } else if (channel.accountNumber) {
        doc.text(`A/C: ${channel.accountNumber}`, rightX, cy);
        cy += lineH;
      }
      if (channel.notes) {
        doc.text(channel.notes, rightX, cy);
        cy += lineH;
      }
    });
  }

  return availableBottom;
}

function drawDeliverySignatures(
  doc: jsPDF,
  startY: number,
  preparedBy: string,
) {
  let y = Math.max(startY + 10, 240);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setColorFromHex(doc, DEFAULT_GRAY, "text");

  doc.text("Received By", 14, y);
  doc.line(14, y + 12, 90, y + 12);
  doc.setFontSize(8);
  doc.text("Name & Signature", 14, y + 18);

  doc.setFontSize(10);
  doc.text("Delivered By", 110, y);
  doc.line(110, y + 12, 190, y + 12);
  doc.setFontSize(8);
  doc.text(preparedBy, 110, y + 18);
}

function drawPreparedBySignatureBlock(
  doc: jsPDF,
  startY: number,
  preparedBy: string,
  signatureDataUrl?: string,
) {
  // Move up to be above Terms & Conditions (which usually sit around 262)
  const y = Math.min(Math.max(startY + 10, 232), 242);

  const signatureW = 32;
  const signatureH = 12;
  const leftEdge = 12;

  // Left-aligned small label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  doc.text("Prepared & Signed By", leftEdge, y);

  // Draw primary signature line (left-aligned)
  const lineW = 60;
  const lineRight = leftEdge + lineW;

  setColorFromHex(doc, "#94a3b8", "draw");
  doc.setLineWidth(0.35);
  doc.line(leftEdge, y + 14, lineRight, y + 14);

  // If signature image exists, draw it above the line (left-aligned)
  if (signatureDataUrl) {
    try {
      const lower = signatureDataUrl.toLowerCase();
      const format =
        lower.includes("jpeg") || lower.includes("jpg") ? "JPEG" : "PNG";
      const sigX = leftEdge + 2; // small padding from left
      const sigY = y + 2; // signature image top
      doc.addImage(
        signatureDataUrl,
        format,
        sigX,
        sigY,
        signatureW,
        signatureH,
      );
    } catch {
      // ignore
    }
  }

  // Render name below the line (left-aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text(preparedBy || "", leftEdge, y + 19);
}

function getCompanyContactRows(
  branding?: TenantBranding,
  settings?: InvoiceDocumentSettings,
) {
  const phone = String(settings?.contactPhone || branding?.phone || "").trim();
  const location = String(
    settings?.officeLocation || buildCompanyAddress(branding) || "",
  ).trim();
  const email = String(
    settings?.contactEmail || settings?.invoiceEmail || branding?.email || "",
  ).trim();
  const website = String(settings?.website || branding?.website || "").trim();
  const vatNumber = String(settings?.vatNumber || "").trim();
  const pinNumber = String(settings?.pinNumber || "").trim();

  return [
    { label: "Phone", value: phone },
    { label: "Email", value: email },
    { label: "Website", value: website },
    { label: "Address", value: location },
    { label: "VAT", value: vatNumber },
    { label: "PIN", value: pinNumber },
  ].filter((row) => row.value);
}

function drawLogoBlock(
  doc: jsPDF,
  branding?: TenantBranding,
  x = 12,
  y = 12,
  maxWidth = 44,
  maxHeight = 20,
) {
  if (!branding?.logo) return;
  try {
    const lower = branding.logo.toLowerCase();
    const format =
      lower.includes("jpg") || lower.includes("jpeg") ? "JPEG" : "PNG";
    let imageWidth = 0;
    let imageHeight = 0;
    try {
      const imageProps = doc.getImageProperties(branding.logo);
      imageWidth = Number(imageProps?.width || 0);
      imageHeight = Number(imageProps?.height || 0);
    } catch {
      imageWidth = 3;
      imageHeight = 1;
    }

    let drawWidth = maxWidth;
    let drawHeight = maxHeight;
    if (imageWidth > 0 && imageHeight > 0) {
      const ratio = imageWidth / imageHeight;
      if (ratio >= 1) {
        drawWidth = maxWidth;
        drawHeight = Math.min(maxHeight, drawWidth / ratio);
      } else {
        drawHeight = maxHeight;
        drawWidth = Math.min(maxWidth, drawHeight * ratio);
      }
    }

    doc.addImage(
      branding.logo,
      format,
      x,
      y + (maxHeight - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
  } catch (e) {
    console.warn("Logo failed to load", e);
  }
}

/** Page 2+ header: logo left, company contact block right-aligned */
function drawContinuationPageHeader(
  doc: jsPDF,
  branding?: TenantBranding,
  settings?: InvoiceDocumentSettings,
) {
  drawLogoBlock(doc, branding, 12, 12);

  const rows = getCompanyContactRows(branding, settings);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  setColorFromHex(doc, DEFAULT_GRAY, "text");

  let y = 14;
  rows.forEach((row) => {
    const wrapped = doc.splitTextToSize(row.value, 88) as string[];
    doc.text(`${row.label}: ${wrapped[0] || ""}`, 198, y, { align: "right" });
    y += 3.8;
  });

  drawThinDivider(doc, Math.max(38, y + 2));
  return Math.max(44, y + 4);
}

/** Page 1 tender metadata — replaces Bill To / Quotation Info on tender PDFs */
function drawTenderDetailsSection(
  doc: jsPDF,
  details: {
    tenderName: string;
    department: string;
    tenderNumber: string;
    createdAt: string;
    clientName?: string;
  },
  branding?: TenantBranding,
  startY = 72,
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY;
  const boxX = 12;
  const boxY = startY;
  const boxW = 186;
  const headerH = 6.5;
  const padX = 3.5;
  const lineH = 4.2;

  const lines = [
    { label: "Application Name", value: details.tenderName || "—" },
    { label: "Client Name", value: details.clientName || "—" },
    { label: "Department", value: details.department || "—" },
    { label: "Application Number", value: details.tenderNumber || "—" },
    {
      label: "Date Issued",
      value: new Date(details.createdAt).toLocaleDateString("en-KE"),
    },
  ];

  const boxH = headerH + 8 + lines.length * lineH;

  setColorFromHex(doc, primary, "draw");
  doc.setLineWidth(0.35);
  doc.rect(boxX, boxY, boxW, boxH);
  setColorFromHex(doc, DEFAULT_LIGHT, "fill");
  doc.rect(boxX, boxY, boxW, headerH, "F");
  doc.line(boxX, boxY + headerH, boxX + boxW, boxY + headerH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text("Application Details", boxX + padX, boxY + 4.5);

  let y = boxY + headerH + 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  lines.forEach((line) => {
    doc.setFont("helvetica", "bold");
    setColorFromHex(doc, DEFAULT_TEXT, "text");
    doc.text(`${line.label}:`, boxX + padX, y);
    doc.setFont("helvetica", "normal");
    setColorFromHex(doc, DEFAULT_GRAY, "text");
    const valueX = boxX + 38;
    const wrapped = doc.splitTextToSize(line.value, boxW - 42) as string[];
    doc.text(wrapped[0] || "—", valueX, y);
    y += lineH;
  });

  return boxY + boxH + 4;
}

type TenderTableRow =
  | { kind: "category"; name: string }
  | { kind: "item"; item: DocumentItem; index: number }
  | { kind: "categorySubtotal"; categoryName: string; subtotal: number };

function buildTenderTableRows(
  items: DocumentItem[],
  groupedByCategory?: Record<string, DocumentItem[]>,
): TenderTableRow[] {
  if (groupedByCategory && Object.keys(groupedByCategory).length > 0) {
    const rows: TenderTableRow[] = [];
    for (const [category, categoryItems] of Object.entries(groupedByCategory)) {
      rows.push({ kind: "category", name: category });

      // Sort products within this category by price, highest first, so
      // the most expensive item appears at the top of the category and
      // the cheapest appears at the bottom.
      const sortedCategoryItems = [...categoryItems].sort(
        (a, b) => Number(b.unitPrice || 0) - Number(a.unitPrice || 0),
      );

      let categoryIndex = 0;
      let categorySubtotal = 0;
      for (const item of sortedCategoryItems) {
        rows.push({ kind: "item", item, index: categoryIndex });
        categorySubtotal += item.lineTotal;
        categoryIndex += 1;
      }
      rows.push({
        kind: "categorySubtotal",
        categoryName: category,
        subtotal: categorySubtotal,
      });
    }
    return rows;
  }
  return items.map((item, index) => ({ kind: "item", item, index }));
}

function drawTenderItemsTable(
  doc: jsPDF,
  startY: number,
  items: DocumentItem[],
  branding?: TenantBranding,
  groupedByCategory?: Record<string, DocumentItem[]>,
  invoiceSettings?: InvoiceDocumentSettings,
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY;
  const tableX = 12;
  const tableWidth = 186;
  const headerHeight = 11;
  const baseRowHeight = 10.5;
  const descLineH = 3;
  // Leave enough room on every page for the footer; the totals box (and,
  // on the very last page, the signature block) are positioned separately
  // by the caller, so this only needs to guard the item rows themselves.
  const pageBottomLimit = 265;

  const columns = [
    { key: "index", label: "#", width: 12, align: "left" as const },
    {
      key: "description",
      label: "Description",
      width: 98,
      align: "left" as const,
    },
    { key: "quantity", label: "Qty", width: 18, align: "right" as const },
    {
      key: "unitPrice",
      label: "Unit Price (KSh)",
      width: 34,
      align: "right" as const,
    },
    { key: "total", label: "Total", width: 24, align: "right" as const },
  ];

  const columnStartX = columns.map((_, index) => {
    return (
      tableX + columns.slice(0, index).reduce((sum, c) => sum + c.width, 0)
    );
  });

  const rows = buildTenderTableRows(items, groupedByCategory);
  const descColWidth = columns[1].width - 8;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  const itemDescLines = rows.map((row) => {
    if (row.kind !== "item" || !row.item.description) return [] as string[];
    return doc.splitTextToSize(row.item.description, descColWidth) as string[];
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const getRowHeight = (rowIndex: number) => {
    const row = rows[rowIndex];
    if (row.kind === "category") return 8;
    if (row.kind === "categorySubtotal") return 8;
    const lines = itemDescLines[rowIndex];
    let h = baseRowHeight;
    if (lines.length > 0) h = Math.max(h, 10 + lines.length * descLineH + 2);
    const item = row.item;
    if (item.showImageOnQuote && item.imageUrl) h = Math.max(h, 22);
    return h;
  };

  const drawTableHeader = (headerY: number) => {
    setColorFromHex(doc, primary, "fill");
    doc.rect(tableX, headerY, tableWidth, headerHeight, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    columns.forEach((column, index) => {
      const startX = columnStartX[index];
      const endX = startX + column.width;
      if (column.key === "unitPrice") {
        doc.text("Unit Price (KSh)", endX - 3, headerY + 8.5, {
          align: "right",
        });
      } else if (column.align === "right") {
        doc.text(column.label, endX - 3, headerY + 8.5, { align: "right" });
      } else {
        doc.text(column.label, startX + 3, headerY + 8.5);
      }
    });
    setColorFromHex(doc, primary, "draw");
    doc.setLineWidth(0.45);
    doc.rect(tableX, headerY, tableWidth, headerHeight);
    columns.forEach((_, index) => {
      if (index === 0) return;
      doc.line(
        columnStartX[index],
        headerY,
        columnStartX[index],
        headerY + headerHeight,
      );
    });
  };

  const drawRowGrid = (rowY: number, rh: number) => {
    setColorFromHex(doc, primary, "draw");
    doc.setLineWidth(0.35);
    doc.rect(tableX, rowY, tableWidth, rh);
    columns.forEach((_, index) => {
      if (index === 0) return;
      doc.line(columnStartX[index], rowY, columnStartX[index], rowY + rh);
    });
  };

  const ensureSpace = (currentY: number, needed: number) => {
    if (currentY + needed <= pageBottomLimit) return currentY;
    doc.addPage();
    const headerStart = drawContinuationPageHeader(
      doc,
      branding,
      invoiceSettings,
    );
    drawTableHeader(headerStart);
    return headerStart + headerHeight;
  };

  let y = startY;
  // Guard the very first header draw too — if the tender details box left
  // almost no room on page 1, start the table on a fresh page instead of
  // squeezing in a header with no rows under it.
  if (y + headerHeight + baseRowHeight > pageBottomLimit) {
    doc.addPage();
    y = drawContinuationPageHeader(doc, branding, invoiceSettings);
  }
  drawTableHeader(y);
  y += headerHeight;

  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  rows.forEach((row, rowIndex) => {
    const rh = getRowHeight(rowIndex);
    y = ensureSpace(y, rh);

    if (row.kind === "category") {
      setColorFromHex(doc, DEFAULT_LIGHT, "fill");
      doc.rect(tableX, y, tableWidth, rh, "F");
      setColorFromHex(doc, primary, "draw");
      doc.setLineWidth(0.35);
      doc.rect(tableX, y, tableWidth, rh);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      setColorFromHex(doc, DEFAULT_TEXT, "text");
      doc.text(String(row.name).toUpperCase(), tableX + 3, y + 5.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      y += rh;
      return;
    }

    if (row.kind === "categorySubtotal") {
      y = ensureSpace(y, 8);
      setColorFromHex(doc, "#f3f4f6", "fill");
      doc.rect(tableX, y, tableWidth, 8, "F");
      setColorFromHex(doc, primary, "draw");
      doc.setLineWidth(0.35);
      doc.rect(tableX, y, tableWidth, 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      setColorFromHex(doc, "#1f2937", "text");
      doc.text("Category Total", tableX + 3, y + 5.5);
      doc.text(
        formatAmount(row.subtotal),
        columnStartX[4] + columns[4].width - 3,
        y + 5.5,
        { align: "right" },
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      y += 8;
      return;
    }

    const item = row.item;
    const displayIndex = row.index + 1;

    if (row.index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, y, tableWidth, rh, "F");
    }
    drawRowGrid(y, rh);

    const maxNameLength = 62;
    const name =
      item.productName.length > maxNameLength
        ? `${item.productName.slice(0, maxNameLength - 3)}...`
        : item.productName;

    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(String(displayIndex).padStart(2, "0"), columnStartX[0] + 2, y + 7);

    let textX = columnStartX[1] + 3;
    if (item.showImageOnQuote && item.imageUrl) {
      try {
        const fullUrl = item.imageUrl.startsWith("http")
          ? item.imageUrl
          : `${API_URL}${item.imageUrl}`;
        doc.addImage(fullUrl, "WEBP", textX, y + 2, 12, 12);
        textX += 15;
      } catch (e) {
        console.warn("Failed to add image to tender PDF", e);
      }
    }

    doc.text(name, textX, y + 7);

    const descLines = itemDescLines[rowIndex];
    if (descLines.length > 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      setColorFromHex(doc, DEFAULT_GRAY, "text");
      let descY = y + 11;
      descLines.forEach((line: string) => {
        doc.text(`• ${line}`, textX + 2, descY);
        descY += descLineH;
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
    }

    doc.text(
      String(item.quantity),
      columnStartX[2] + columns[2].width - 3,
      y + 7,
      { align: "right" },
    );
    doc.text(
      formatAmount(item.unitPrice),
      columnStartX[3] + columns[3].width - 3,
      y + 7,
      { align: "right" },
    );
    doc.text(
      formatAmount(item.lineTotal),
      columnStartX[4] + columns[4].width - 3,
      y + 7,
      { align: "right" },
    );

    y += rh;
  });

  return y;
}

/**
 * Category-by-category subtotal recap, drawn as part of the continuous
 * document flow (right after the items table, before the totals box) —
 * never as a page appended after the document has already "ended".
 * Only starts a new page if it genuinely doesn't fit where it is.
 */
function drawTenderCategoryRecap(
  doc: jsPDF,
  startY: number,
  groupedByCategory: Record<string, DocumentItem[]> | undefined,
  subTotal: number,
  branding?: TenantBranding,
  settings?: InvoiceDocumentSettings,
) {
  if (!groupedByCategory || Object.keys(groupedByCategory).length === 0) {
    return startY;
  }

  const primary = branding?.primaryColor || DEFAULT_PRIMARY;
  const tableX = 12;
  const tableWidth = 186;
  const titleH = 10;
  const headerHeight = 8.5;
  const rowHeight = 7;
  const totalRowHeight = 9;
  const categoryCount = Object.keys(groupedByCategory).length;
  const neededHeight =
    titleH + headerHeight + categoryCount * rowHeight + totalRowHeight + 4;

  let y = startY + 6;
  if (y + neededHeight > 265) {
    doc.addPage();
    y = drawContinuationPageHeader(doc, branding, settings) + 6;
  }

  const colWidths = [120, 40, 26];
  const colPositions = [
    tableX,
    tableX + colWidths[0],
    tableX + colWidths[0] + colWidths[1],
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text("Summary by Category", tableX, y);
  y += titleH;

  setColorFromHex(doc, primary, "fill");
  doc.rect(tableX, y, tableWidth, headerHeight, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Category", colPositions[0] + 3, y + 5.8);
  doc.text("Items", colPositions[1] + 3, y + 5.8);
  doc.text("Subtotal", colPositions[2] + 3, y + 5.8, { align: "right" });
  y += headerHeight;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  let rowIndex = 0;
  for (const [category, items] of Object.entries(groupedByCategory)) {
    const categorySubtotal = items.reduce(
      (sum, item) => sum + item.lineTotal,
      0,
    );

    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, y, tableWidth, rowHeight, "F");
    }

    setColorFromHex(doc, primary, "draw");
    doc.setLineWidth(0.3);
    doc.rect(tableX, y, tableWidth, rowHeight);
    doc.line(colPositions[1], y, colPositions[1], y + rowHeight);
    doc.line(colPositions[2], y, colPositions[2], y + rowHeight);

    doc.setTextColor(30, 30, 30);
    doc.text(category, colPositions[0] + 3, y + 4.8);
    doc.text(String(items.length), colPositions[1] + 3, y + 4.8);
    doc.text(
      formatAmount(categorySubtotal),
      colPositions[2] + colWidths[2] - 3,
      y + 4.8,
      { align: "right" },
    );

    y += rowHeight;
    rowIndex += 1;
  }

  setColorFromHex(doc, primary, "fill");
  doc.rect(tableX, y, tableWidth, totalRowHeight, "F");
  setColorFromHex(doc, primary, "draw");
  doc.setLineWidth(0.3);
  doc.rect(tableX, y, tableWidth, totalRowHeight);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("GRAND TOTAL", colPositions[0] + 3, y + 6);
  doc.text(formatAmount(subTotal), colPositions[2] + colWidths[2] - 3, y + 6, {
    align: "right",
  });
  y += totalRowHeight;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);

  return y;
}

export function generateTenderPdf(params: {
  tenderNumber: string;
  tenderName: string;
  department: string;
  createdAt: string;
  items: DocumentItem[];
  subTotal: number;
  branding?: TenantBranding;
  invoiceSettings?: InvoiceDocumentSettings;
  preparedBy: string;
  preparedBySignature?: string;
  watermarkText?: string;
  autoSave?: boolean;
  groupedByCategory?: Record<string, DocumentItem[]>;
  clientName?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  drawWatermark(doc, params.watermarkText);

  drawModernHeader(doc, {
    title: "Quotation",
    numberLabel: "Quotation Number",
    numberValue: params.tenderNumber,
    createdAt: params.createdAt,
    branding: params.branding,
  });

  const tableY = drawTenderDetailsSection(
    doc,
    {
      tenderName: params.tenderName,
      department: params.department,
      tenderNumber: params.tenderNumber,
      createdAt: params.createdAt,
      clientName: params.clientName,
    },
    params.branding,
  );

  const itemsEndY = drawTenderItemsTable(
    doc,
    tableY,
    params.items,
    params.branding,
    params.groupedByCategory,
    params.invoiceSettings,
  );

  // Category recap flows directly on from the items table — same page if
  // there's room, otherwise a normal continuation page. Never appended
  // after the rest of the document has already finished.
  const recapEndY = drawTenderCategoryRecap(
    doc,
    itemsEndY,
    params.groupedByCategory,
    params.subTotal,
    params.branding,
    params.invoiceSettings,
  );

  const totalsY = drawTotalsSection(
    doc,
    params.subTotal,
    recapEndY,
    params.branding,
    params.invoiceSettings,
  );

  if (params.invoiceSettings?.includePreparedBy !== false) {
    drawPreparedBySignatureBlock(
      doc,
      totalsY,
      params.preparedBy,
      params.preparedBySignature,
    );
  }

  drawBottomFooter(
    doc,
    params.branding,
    params.invoiceSettings,
    params.preparedBy,
  );

  if (params.autoSave !== false) {
    doc.save(`tender-${params.tenderNumber}.pdf`);
  }

  return doc;
}

export interface SummaryReportItem {
  date: string;
  documentNumber: string;
  clientName: string;
  salesperson: string;
  products: string[];
  status: string;
  amount: number;
  paid?: number;
  balance?: number;
}

function drawLandscapeSummaryHeader(
  doc: jsPDF,
  title: string,
  branding?: TenantBranding,
  periodStr?: string,
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY;

  // Left side - Logo & Company
  if (branding?.logo) {
    try {
      const lower = branding.logo.toLowerCase();
      const format =
        lower.includes("jpg") || lower.includes("jpeg") ? "JPEG" : "PNG";
      doc.addImage(branding.logo, format, 12, 12, 40, 16);
    } catch {}
  } else if (branding?.name) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    setColorFromHex(doc, DEFAULT_TEXT, "text");
    doc.text(branding.name, 12, 20);
  }

  // Right side - Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  setColorFromHex(doc, primary, "text");
  doc.text(title.toUpperCase(), 285, 20, { align: "right" });

  if (periodStr) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setColorFromHex(doc, DEFAULT_GRAY, "text");
    doc.text(periodStr, 285, 28, { align: "right" });
  }

  // Divider
  setColorFromHex(doc, "#e2e8f0", "draw");
  doc.setLineWidth(0.4);
  doc.line(12, 34, 285, 34);

  return 42;
}

function drawLandscapeSummaryTable(
  doc: jsPDF,
  startY: number,
  items: SummaryReportItem[],
  totalAmount: number,
  branding?: TenantBranding,
  periodStr?: string,
  title: string = "SUMMARY REPORT",
) {
  const primary = branding?.primaryColor || DEFAULT_PRIMARY;
  const hasPaidAndBalance = items.some(
    (i) => i.paid !== undefined || i.balance !== undefined,
  );
  const columns = hasPaidAndBalance
    ? [
        { header: "Date", width: 23 },
        { header: "Doc #", width: 33 },
        { header: "Client", width: 40 },
        { header: "Salesperson", width: 35 },
        { header: "Products", width: 50 },
        { header: "Status", width: 20 },
        { header: "Amount", width: 24 },
        { header: "Paid", width: 24 },
        { header: "Balance", width: 24 },
      ]
    : [
        { header: "Date", width: 25 },
        { header: "Doc #", width: 35 },
        { header: "Client", width: 45 },
        { header: "Salesperson", width: 40 },
        { header: "Products", width: 78 },
        { header: "Status", width: 20 },
        { header: "Amount", width: 30 },
      ];

  const startX = 12;
  const pageBottomLimit = 195; // A4 Landscape is 210mm high
  let y = startY;

  const drawHeaderRow = (currentY: number) => {
    setColorFromHex(doc, primary, "fill");
    doc.rect(startX, currentY, 273, 9, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);

    let currentX = startX;
    columns.forEach((col, i) => {
      let align: "left" | "right" = "left";
      let xOffset = 3;
      if (i === columns.length - 1) {
        align = "right";
        xOffset = col.width - 3;
      }
      doc.text(col.header, currentX + xOffset, currentY + 6, { align });
      currentX += col.width;
    });
    return currentY + 9;
  };

  y = drawHeaderRow(y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  const drawRowBackground = (
    currentY: number,
    height: number,
    rowIndex: number,
  ) => {
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(startX, currentY, 273, height, "F");
    }
    setColorFromHex(doc, primary, "draw");
    doc.setLineWidth(0.2);
    // Left edge
    doc.line(startX, currentY, startX, currentY + height);
    // Right edge
    doc.line(startX + 273, currentY, startX + 273, currentY + height);
    // Bottom edge
    doc.line(startX, currentY + height, startX + 273, currentY + height);

    // Vertical dividers
    let currentX = startX;
    columns.forEach((col) => {
      if (currentX > startX) {
        doc.line(currentX, currentY, currentX, currentY + height);
      }
      currentX += col.width;
    });
  };

  items.forEach((item, rowIndex) => {
    const defaultRowHeight = 8;
    // Calculate products column height
    const maxLineLength = 55;
    const allProductText = item.products.join("\n");
    const productLines = doc.splitTextToSize(
      allProductText,
      columns[4].width - 4,
    );

    const requiredHeight = Math.max(
      defaultRowHeight,
      productLines.length * 4 + 4,
    );

    if (y + requiredHeight > pageBottomLimit) {
      doc.addPage();
      y = drawLandscapeSummaryHeader(doc, title, branding, periodStr);
      y = drawHeaderRow(y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
    }

    drawRowBackground(y, requiredHeight, rowIndex);

    setColorFromHex(doc, DEFAULT_TEXT, "text");

    let currentX = startX;

    // Date
    doc.text(item.date, currentX + 3, y + 5);
    currentX += columns[0].width;

    // Doc #
    const docNoLines = doc.splitTextToSize(
      item.documentNumber,
      columns[1].width - 4,
    );
    doc.text(docNoLines, currentX + 3, y + 5);
    currentX += columns[1].width;

    // Client
    const clientLines = doc.splitTextToSize(
      item.clientName,
      columns[2].width - 4,
    );
    doc.text(clientLines, currentX + 3, y + 5);
    currentX += columns[2].width;

    // Salesperson
    const sellerLines = doc.splitTextToSize(
      item.salesperson,
      columns[3].width - 4,
    );
    doc.text(sellerLines, currentX + 3, y + 5);
    currentX += columns[3].width;

    // Products
    doc.setFont("helvetica", "italic");
    setColorFromHex(doc, DEFAULT_GRAY, "text");
    doc.text(productLines, currentX + 2, y + 5);
    doc.setFont("helvetica", "normal");
    setColorFromHex(doc, DEFAULT_TEXT, "text");
    currentX += columns[4].width;

    // Status
    doc.text(item.status.replace("_", " ").toUpperCase(), currentX + 3, y + 5);
    currentX += columns[5].width;

    // Amount
    doc.setFont("helvetica", "bold");
    doc.text(
      formatAmount(item.amount),
      currentX + columns[6].width - 3,
      y + 5,
      { align: "right" },
    );
    currentX += columns[6].width;
    doc.setFont("helvetica", "normal");

    if (hasPaidAndBalance) {
      doc.text(
        formatAmount(item.paid || 0),
        currentX + columns[7].width - 3,
        y + 5,
        { align: "right" },
      );
      currentX += columns[7].width;

      doc.text(
        formatAmount(item.balance || 0),
        currentX + columns[8].width - 3,
        y + 5,
        { align: "right" },
      );
      currentX += columns[8].width;
    }

    y += requiredHeight;
  });

  // Totals Row
  if (y + 10 > pageBottomLimit) {
    doc.addPage();
    y = drawLandscapeSummaryHeader(doc, title, branding, periodStr);
  }

  setColorFromHex(doc, DEFAULT_LIGHT, "fill");
  doc.rect(startX, y, 273, 10, "F");
  setColorFromHex(doc, primary, "draw");
  doc.setLineWidth(0.4);
  doc.rect(startX, y, 273, 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL SUMMARY", startX + 3, y + 6.5);

  if (hasPaidAndBalance) {
    const totalPaid = items.reduce((sum, item) => sum + (item.paid || 0), 0);
    const totalBalance = items.reduce(
      (sum, item) => sum + (item.balance || 0),
      0,
    );
    doc.text(formatAmount(totalAmount), startX + 225 - 3, y + 6.5, {
      align: "right",
    });
    doc.text(formatAmount(totalPaid), startX + 249 - 3, y + 6.5, {
      align: "right",
    });
    doc.text(formatAmount(totalBalance), startX + 273 - 3, y + 6.5, {
      align: "right",
    });
  } else {
    doc.text(formatAmount(totalAmount), startX + 273 - 3, y + 6.5, {
      align: "right",
    });
  }

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  const timeStr = new Date().toLocaleString("en-KE");
  doc.text(`Generated on ${timeStr}`, 285, 203, { align: "right" });

  return y + 10;
}

export function generateQuotationStyleSummaryPdf(params: {
  quotations: Array<{
    quotationNumber: string;
    createdAt: string;
    client: DocumentClient;
    items: DocumentItem[];
    subTotal: number;
    convertedInvoiceNumber?: string;
    status?: string;
    salesperson?: string;
  }>;
  branding?: TenantBranding;
  periodStr?: string;
  watermarkText?: string;
  autoSave?: boolean;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  if (params.watermarkText) {
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(60);
    doc.text(params.watermarkText.toUpperCase(), 148, 105, {
      angle: 25,
      align: "center",
    });
  }

  const items: SummaryReportItem[] = params.quotations.map((q) => ({
    date: new Date(q.createdAt).toLocaleDateString("en-GB"),
    documentNumber: q.quotationNumber,
    clientName: q.client.name,
    salesperson: q.salesperson || "N/A",
    products: q.items.map((i) => `${i.productName} (${i.quantity}x)`),
    status: q.status || "N/A",
    amount: q.subTotal,
  }));

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const startY = drawLandscapeSummaryHeader(
    doc,
    "Quotations Summary",
    params.branding,
    params.periodStr,
  );
  drawLandscapeSummaryTable(
    doc,
    startY,
    items,
    totalAmount,
    params.branding,
    params.periodStr,
    "Quotations Summary",
  );

  if (params.autoSave !== false) {
    doc.save("quotations-summary.pdf");
  }

  return doc;
}

export function generateInvoiceStyleSummaryPdf(params: {
  invoices: Array<{
    invoiceNumber: string;
    deliveryNoteNumber?: string;
    quotationNumber?: string;
    createdAt: string;
    client: DocumentClient;
    items: DocumentItem[];
    subTotal: number;
    status: string;
    salesperson?: string;
    paidAmount?: number;
    balanceRemaining?: number;
  }>;
  branding?: TenantBranding;
  periodStr?: string;
  watermarkText?: string;
  autoSave?: boolean;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  if (params.watermarkText) {
    doc.setTextColor(230, 230, 230);
    doc.setFontSize(60);
    doc.text(params.watermarkText.toUpperCase(), 148, 105, {
      angle: 25,
      align: "center",
    });
  }

  const items: SummaryReportItem[] = params.invoices.map((inv) => ({
    date: new Date(inv.createdAt).toLocaleDateString("en-GB"),
    documentNumber: inv.invoiceNumber,
    clientName: inv.client.name,
    salesperson: inv.salesperson || "N/A",
    products: inv.items.map((i) => `${i.productName} (${i.quantity}x)`),
    status: inv.status,
    amount: inv.subTotal,
    paid: inv.paidAmount,
    balance: inv.balanceRemaining,
  }));

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const startY = drawLandscapeSummaryHeader(
    doc,
    "Invoices Summary",
    params.branding,
    params.periodStr,
  );
  drawLandscapeSummaryTable(
    doc,
    startY,
    items,
    totalAmount,
    params.branding,
    params.periodStr,
    "Invoices Summary",
  );

  if (params.autoSave !== false) {
    doc.save("invoices-summary.pdf");
  }

  return doc;
}

export function generateQuotationPdf(params: {
  quotationNumber: string;
  createdAt: string;
  client: DocumentClient;
  items: DocumentItem[];
  subTotal: number;
  branding?: TenantBranding;
  invoiceSettings?: InvoiceDocumentSettings;
  preparedBy: string;
  preparedBySignature?: string;
  watermarkText?: string;
  autoSave?: boolean;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  drawWatermark(doc, params.watermarkText);

  drawModernHeader(doc, {
    title: "Quotation",
    numberLabel: "Quotation No",
    numberValue: params.quotationNumber,
    createdAt: params.createdAt,
    branding: {
      ...params.branding,
      invoiceEmail:
        params.invoiceSettings?.invoiceEmail || params.branding?.invoiceEmail,
    },
  });
  const contactBottom = drawContactSlotBelowLogo(
    doc,
    params.branding,
    params.invoiceSettings,
  );

  let tableY = drawPartiesSection(
    doc,
    params.client,
    undefined,
    {
      ...params.branding,
      invoiceEmail:
        params.invoiceSettings?.invoiceEmail || params.branding?.invoiceEmail,
    },
    "Quotation Info",
    contactBottom + 1,
  );

  // Add a spacing line for consistency with invoice layout
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  tableY = tableY + 2;

  const endY = drawItemsTable(doc, tableY, params.items, params.branding);

  const totalsY = drawTotalsSection(
    doc,
    params.subTotal,
    endY,
    params.branding,
    params.invoiceSettings,
  );

  const termsEndY = drawTermsAndPaymentChannelsSection(
    doc,
    totalsY,
    params.invoiceSettings,
    params.branding,
  );

  if (params.invoiceSettings?.includePreparedBy !== false) {
    drawPreparedBySignatureBlock(
      doc,
      totalsY,
      params.preparedBy,
      params.preparedBySignature,
    );
  }

  drawBottomFooter(
    doc,
    params.branding,
    params.invoiceSettings,
    params.invoiceSettings?.includePreparedBy !== false
      ? params.preparedBy
      : undefined,
  );

  if (params.autoSave !== false) {
    doc.save(`quotation-${params.quotationNumber}.pdf`);
  }

  return doc;
}

export function generateInvoicePdf(params: {
  invoiceNumber: string;
  deliveryNoteNumber: string;
  quotationNumber?: string;
  createdAt: string;
  client: DocumentClient;
  items: DocumentItem[];
  subTotal: number;
  branding?: TenantBranding;
  invoiceSettings?: InvoiceDocumentSettings;
  preparedBy: string;
  preparedBySignature?: string;
  watermarkText?: string;
  autoSave?: boolean;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  drawWatermark(doc, params.watermarkText);

  drawModernHeader(doc, {
    title: "Invoice",
    numberLabel: "Invoice No",
    numberValue: params.invoiceNumber,
    createdAt: params.createdAt,
    branding: {
      ...params.branding,
      invoiceEmail:
        params.invoiceSettings?.invoiceEmail || params.branding?.invoiceEmail,
    },
  });

  const contactBottom = drawContactSlotBelowLogo(
    doc,
    params.branding,
    params.invoiceSettings,
  );

  let tableY = drawPartiesSection(
    doc,
    params.client,
    undefined,
    {
      ...params.branding,
      invoiceEmail:
        params.invoiceSettings?.invoiceEmail || params.branding?.invoiceEmail,
    },
    "Invoice Info",
    contactBottom + 1,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  const showDelivery =
    params.invoiceSettings?.includeDeliveryNoteNumber !== false;
  const showQuote = params.invoiceSettings?.includeQuotationReference !== false;
  if (showDelivery || showQuote) {
    const refsY = tableY + 1;
    if (showDelivery) {
      doc.text(`Delivery Note: ${params.deliveryNoteNumber}`, 12, refsY);
    }
    if (showQuote) {
      doc.text(
        `Quotation Ref: ${params.quotationNumber || "N/A"}`,
        198,
        refsY,
        { align: "right" },
      );
    }
    tableY = refsY + 6;
  }

  const endY = drawItemsTable(doc, tableY, params.items, params.branding);

  const totalsY = drawTotalsSection(
    doc,
    params.subTotal,
    endY,
    params.branding,
    params.invoiceSettings,
  );
  const termsEndY = drawTermsAndPaymentChannelsSection(
    doc,
    totalsY,
    params.invoiceSettings,
    params.branding,
  );

  if (params.invoiceSettings?.includePreparedBy !== false) {
    drawPreparedBySignatureBlock(
      doc,
      totalsY,
      params.preparedBy,
      params.preparedBySignature,
    );
  }

  drawBottomFooter(
    doc,
    params.branding,
    params.invoiceSettings,
    params.invoiceSettings?.includePreparedBy !== false
      ? params.preparedBy
      : undefined,
  );

  if (params.autoSave !== false) {
    doc.save(`invoice-${params.invoiceNumber}.pdf`);
  }

  return doc;
}

export function generateDeliveryNotePdf(params: {
  invoiceNumber: string;
  deliveryNoteNumber: string;
  createdAt: string;
  client: DocumentClient;
  items: DocumentItem[];
  branding?: TenantBranding;
  invoiceSettings?: InvoiceDocumentSettings;
  preparedBy: string;
  preparedBySignature?: string;
  watermarkText?: string;
  autoSave?: boolean;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  drawWatermark(doc, params.watermarkText);

  drawModernHeader(doc, {
    title: "Delivery Note",
    numberLabel: "D/N No",
    numberValue: params.deliveryNoteNumber,
    createdAt: params.createdAt,
    branding: params.branding,
  });

  const contactBottom = drawContactSlotBelowLogo(
    doc,
    params.branding,
    params.invoiceSettings,
  );

  let tableY = drawPartiesSection(
    doc,
    params.client,
    params.preparedBy,
    params.branding,
    "Delivery Info",
    contactBottom + 1,
  );

  const endY = drawItemsTable(doc, tableY, params.items, params.branding, true); // compact mode

  drawDeliverySignatures(doc, endY, params.preparedBy);

  drawBottomFooter(
    doc,
    params.branding,
    params.invoiceSettings,
    params.preparedBy,
  );

  if (params.autoSave !== false) {
    doc.save(`delivery-note-${params.deliveryNoteNumber}.pdf`);
  }

  return doc;
}

export function generateCreditNotePdf(params: {
  creditNoteNumber: string;
  invoiceNumber: string;
  createdAt: string;
  client: DocumentClient;
  items: DocumentItem[];
  subTotal: number;
  reason: string;
  reasonDetails?: string;
  branding?: TenantBranding;
  invoiceSettings?: InvoiceDocumentSettings;
  preparedBy?: string;
  watermarkText?: string;
  autoSave?: boolean;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  drawWatermark(doc, params.watermarkText || "CREDIT NOTE");

  drawModernHeader(doc, {
    title: "Credit Note",
    numberLabel: "Credit Note No",
    numberValue: params.creditNoteNumber,
    createdAt: params.createdAt,
    branding: params.branding,
  });

  const contactBottom = drawContactSlotBelowLogo(
    doc,
    params.branding,
    params.invoiceSettings,
  );

  let tableY = drawPartiesSection(
    doc,
    params.client,
    undefined,
    {
      ...params.branding,
      invoiceEmail:
        params.invoiceSettings?.invoiceEmail || params.branding?.invoiceEmail,
    },
    "Credit Note Info",
    contactBottom + 1,
  );

  // Add reference to original invoice
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  doc.text(`Reference Invoice: ${params.invoiceNumber}`, 12, tableY + 1);

  // Add reason section
  const reasonY = tableY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text("Reason for Credit:", 12, reasonY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  doc.text(params.reason, 15, reasonY + 5);

  if (params.reasonDetails) {
    const detailsLines = doc.splitTextToSize(params.reasonDetails, 180);
    doc.text("Details: " + detailsLines[0], 15, reasonY + 9);
    if (detailsLines.length > 1) {
      detailsLines.slice(1).forEach((line: string, idx: number) => {
        doc.text(line, 15, reasonY + 13 + idx * 4);
      });
    }
  }

  tableY = reasonY + (params.reasonDetails ? 20 : 12);

  const endY = drawItemsTable(doc, tableY, params.items, params.branding);

  const totalsY = drawTotalsSection(
    doc,
    params.subTotal,
    endY,
    params.branding,
    params.invoiceSettings,
  );

  drawBottomFooter(
    doc,
    params.branding,
    params.invoiceSettings,
    params.preparedBy,
  );

  if (params.autoSave !== false) {
    doc.save(`credit-note-${params.creditNoteNumber}.pdf`);
  }

  return doc;
}

/**
 * Apply a stamp to an existing PDF document
 * @param doc - jsPDF document instance
 * @param stampData - SVG stamp data or URL
 * @param x - X coordinate in mm
 * @param y - Y coordinate in mm
 * @param width - Width of stamp in mm (default 30)
 * @param height - Height of stamp in mm (default 30)
 */
export async function applyStampToPdf(
  doc: jsPDF,
  stampData: string,
  x: number,
  y: number,
  width: number = 30,
  height: number = 30,
): Promise<void> {
  try {
    // If stampData is a URL, fetch it
    let svgContent = stampData;
    if (stampData.startsWith("http")) {
      const response = await fetch(stampData);
      if (!response.ok)
        throw new Error(`Failed to fetch SVG: ${response.statusText}`);
      svgContent = await response.text();
    }

    // Clean SVG content: remove XML declarations and trim
    svgContent = svgContent
      .replace(/^\s*<\?xml[^?]*\?>\s*/i, "") // Remove XML declaration
      .trim();

    // Fix partially quoted attributes: attribute="value1" value2 value3 -> attribute="value1 value2 value3"
    svgContent = svgContent.replace(
      /(\s[a-zA-Z\-:]+)="([^"]*)"(\s+[^=\s>][^=]*?)(?=\s+[a-zA-Z\-:]+\s*=|\s*>)/g,
      '$1="$2$3"',
    );

    // Fix simple unquoted attributes: attribute=value -> attribute="value"
    svgContent = svgContent.replace(
      /\s([a-zA-Z\-:]+)=([a-zA-Z0-9#:\-._\/]+)(?=\s|>)/g,
      ' $1="$2"',
    );

    // Remove xmlns:xlink (not needed for canvas rendering)
    svgContent = svgContent.replace(/\s+xmlns:xlink="[^"]*"/g, "");

    // Remove zoomAndPan (not applicable in canvas context)
    svgContent = svgContent.replace(/\s+zoomAndPan="[^"]*"/g, "");

    // Ensure SVG has xmlns if missing (required for proper rendering)
    if (!svgContent.includes('xmlns="')) {
      svgContent = svgContent.replace(
        /<svg\s+/,
        '<svg xmlns="http://www.w3.org/2000/svg" ',
      );
    }

    // Fix or validate viewBox
    const viewBoxMatch = svgContent.match(/viewBox="([^"]*)"/);
    if (viewBoxMatch) {
      const viewBoxValue = viewBoxMatch[1];
      const boxParts = viewBoxValue.trim().split(/\s+/);
      if (boxParts.length !== 4 || boxParts.some((p) => isNaN(parseFloat(p)))) {
        svgContent = svgContent.replace(
          /viewBox="[^"]*"/,
          'viewBox="0 0 200 200"',
        );
      }
    } else if (!svgContent.includes("viewBox=")) {
      svgContent = svgContent.replace(/<svg/, '<svg viewBox="0 0 200 200"');
    }

    // Convert SVG to canvas then to image data
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Use data URL approach with proper encoding (more reliable than blob URLs)
    const encodedSvg = encodeURIComponent(svgContent);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          ctx.drawImage(img, 0, 0);
          const imgData = canvas.toDataURL("image/png");
          doc.addImage(imgData, "PNG", x, y, width, height);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => {
        console.error(
          "Failed to load SVG image. SVG content preview:",
          svgContent.substring(0, 150),
        );
        reject(
          new Error("Failed to load stamp SVG image - ensure SVG is valid"),
        );
      };
      img.src = dataUrl;
    });
  } catch (error) {
    console.error("Error applying stamp to PDF:", error);
  }
}

/**
 * Apply predesigned stamp text overlay to PDF (for simple text-based stamps)
 * @param doc - jsPDF document instance
 * @param text - Stamp text (e.g., "APPROVED")
 * @param x - X coordinate in mm
 * @param y - Y coordinate in mm
 * @param color - Hex color code
 * @param opacity - Opacity 0-1
 * @param rotation - Rotation in degrees
 * @param fontSize - Font size in pt
 */
export function applyTextStampToPdf(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  color: string = "#8B0000",
  opacity: number = 0.2,
  rotation: number = 12,
  fontSize: number = 48,
): void {
  const rgb = hexToRgb(color);

  // Save current state
  const currentPage = doc.getNumberOfPages();

  // Apply stamp
  setColorFromHex(doc, color, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);

  // Use GState for opacity (if supported)
  try {
    const pdfWithGState = doc as any;
    if (pdfWithGState.setGState) {
      pdfWithGState.setGState(new pdfWithGState.GState({ opacity }));
    }
  } catch (e) {
    // Fallback if GState not available
  }

  // Rotate and draw text
  doc.text(text, x, y, {
    align: "center",
    angle: rotation,
  });
}

export function generateStatementOfAccountPdf(params: {
  client: { name: string; number: string; location: string };
  invoices: Array<{
    invoiceNumber: string;
    createdAt: string;
    items: DocumentItem[];
    subTotal: number;
    paidAmount?: number;
    balanceRemaining?: number;
  }>;
  branding?: TenantBranding;
  periodStr?: string;
  autoSave?: boolean;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const startY = 50;

  // Manual generic header for statement of account
  const primary = params.branding?.primaryColor || DEFAULT_PRIMARY;

  if (params.branding?.logo) {
    try {
      const lower = params.branding.logo.toLowerCase();
      const format =
        lower.includes("jpg") || lower.includes("jpeg") ? "JPEG" : "PNG";
      doc.addImage(params.branding.logo, format, 12, 12, 44, 20);
    } catch {}
  } else if (params.branding?.name) {
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    setColorFromHex(doc, DEFAULT_TEXT, "text");
    doc.text(params.branding.name, 12, 24);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  setColorFromHex(doc, primary, "text");
  doc.text("STATEMENT OF ACCOUNT", 198, 25, { align: "right" });

  if (params.periodStr) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setColorFromHex(doc, DEFAULT_GRAY, "text");
    doc.text(params.periodStr, 198, 32, { align: "right" });
  }

  // Client info
  setColorFromHex(doc, DEFAULT_LIGHT, "fill");
  doc.rect(12, 40, 186, 25, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColorFromHex(doc, DEFAULT_TEXT, "text");
  doc.text("CLIENT SUMMARY", 15, 48);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${params.client.name}`, 15, 54);
  doc.text(`Phone: ${params.client.number}`, 15, 60);

  // Table
  let y = 75;
  const columns = [
    { h: "Date", w: 25 },
    { h: "Reference", w: 35 },
    { h: "Products Bought", w: 66 },
    { h: "Value", w: 20 },
    { h: "Paid", w: 20 },
    { h: "Balance", w: 20 },
  ];

  setColorFromHex(doc, primary, "fill");
  doc.rect(12, y, 186, 9, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  let cx = 12;
  columns.forEach((col, i) => {
    let alg: "left" | "right" = i >= 3 ? "right" : "left";
    let off = i >= 3 ? col.w - 3 : 3;
    doc.text(col.h, cx + off, y + 6, { align: alg });
    cx += col.w;
  });

  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  let totalValue = 0;
  let totalPaid = 0;
  let totalBalance = 0;

  params.invoices.forEach((inv, i) => {
    const val = Number(inv.subTotal || 0);
    const paid = Number(inv.paidAmount || 0);
    const bal = Number(inv.balanceRemaining || 0);
    totalValue += val;
    totalPaid += paid;
    totalBalance += bal;

    const prods = inv.items
      .map((i) => `${i.productName} (${i.quantity})`)
      .join(", ");
    const textLines = doc.splitTextToSize(prods, columns[2].w - 4);
    const rh = Math.max(8, textLines.length * 4 + 4);

    if (y + rh > 270) {
      doc.addPage();
      y = 20;
    }

    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(12, y, 186, rh, "F");
    }

    setColorFromHex(doc, DEFAULT_TEXT, "text");
    cx = 12;
    doc.text(
      new Date(inv.createdAt).toLocaleDateString("en-GB"),
      cx + 3,
      y + 5,
    );
    cx += columns[0].w;
    doc.text(inv.invoiceNumber, cx + 3, y + 5);
    cx += columns[1].w;

    doc.setFont("helvetica", "italic");
    setColorFromHex(doc, DEFAULT_GRAY, "text");
    doc.text(textLines, cx + 2, y + 5);
    doc.setFont("helvetica", "normal");
    setColorFromHex(doc, DEFAULT_TEXT, "text");
    cx += columns[2].w;

    doc.text(formatAmount(val), cx + columns[3].w - 3, y + 5, {
      align: "right",
    });
    cx += columns[3].w;
    doc.text(formatAmount(paid), cx + columns[4].w - 3, y + 5, {
      align: "right",
    });
    cx += columns[4].w;
    doc.text(formatAmount(bal), cx + columns[5].w - 3, y + 5, {
      align: "right",
    });

    y += rh;
  });

  if (y + 20 > 270) (doc.addPage(), (y = 20));

  setColorFromHex(doc, primary, "draw");
  doc.line(12, y, 198, y);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    "TOTALS:",
    12 + columns[0].w + columns[1].w + columns[2].w - 3,
    y + 2,
    { align: "right" },
  );
  doc.text(formatAmount(totalValue), 12 + 126 + 20 - 3, y + 2, {
    align: "right",
  });
  doc.text(formatAmount(totalPaid), 12 + 146 + 20 - 3, y + 2, {
    align: "right",
  });
  doc.text(formatAmount(totalBalance), 12 + 166 + 20 - 3, y + 2, {
    align: "right",
  });

  const timeStr = new Date().toLocaleString("en-KE");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColorFromHex(doc, DEFAULT_GRAY, "text");
  doc.text(`Generated on ${timeStr}`, 198, 285, { align: "right" });

  if (params.autoSave !== false) {
    doc.save(`statement-${params.client.name.replace(/\s+/g, "-")}.pdf`);
  }

  return doc;
}
