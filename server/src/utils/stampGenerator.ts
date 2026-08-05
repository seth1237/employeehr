import { IStamp } from "../models/Stamp";

interface StampValues {
  date?: string;
  user?: string;
  stampId?: string;
  poBox?: string;
  email?: string;
}

/**
 * Sanitize SVG: fix malformed attributes and ensure proper XML structure
 */
function sanitizeSVG(svg: string): string {
  // Remove XML declaration
  svg = svg.replace(/^\s*<\?xml[^?]*\?>\s*/i, "");
  
  // Fix partially quoted attributes: attribute="value1" value2 value3 -> attribute="value1 value2 value3"
  // This handles SVGs where viewBox or other multi-value attributes are broken
  svg = svg.replace(/(\s[a-zA-Z\-:]+)="([^"]*)"(\s+[^=\s>][^=]*?)(?=\s+[a-zA-Z\-:]+\s*=|\s*>)/g, '$1="$2$3"');
  
  // Fix unquoted attribute values: attribute=value -> attribute="value"
  // Only fix simple alphanumeric values
  svg = svg.replace(/\s([a-zA-Z\-:]+)=([a-zA-Z0-9#:\-._\/]+)(?=\s|>)/g, ' $1="$2"');
  
  // Remove any xmlns:xlink if present (not needed for canvas rendering)
  svg = svg.replace(/\s+xmlns:xlink="[^"]*"/g, "");
  
  // Remove zoomAndPan if present (not applicable in canvas context)
  svg = svg.replace(/\s+zoomAndPan="[^"]*"/g, "");
  
  // Ensure SVG has xmlns if missing
  if (!svg.includes('xmlns="')) {
    svg = svg.replace(/<svg\s+/, '<svg xmlns="http://www.w3.org/2000/svg" ');
  }
  
  // Extract and fix viewBox if malformed
  const viewBoxMatch = svg.match(/viewBox="([^"]*)"/);
  if (viewBoxMatch) {
    const viewBoxValue = viewBoxMatch[1];
    // Check if viewBox is valid (should have 4 numbers)
    const boxParts = viewBoxValue.trim().split(/\s+/);
    if (boxParts.length !== 4 || boxParts.some(p => isNaN(parseFloat(p)))) {
      // Invalid viewBox, replace with default
      svg = svg.replace(/viewBox="[^"]*"/, 'viewBox="0 0 200 200"');
    }
  } else if (!svg.includes('viewBox=')) {
    // No viewBox at all, add it
    svg = svg.replace(/<svg\s+/, '<svg viewBox="0 0 200 200" ');
  }
  
  return svg.trim();
}

/**
 * Generate SVG stamp from config and dynamic values
 */
export function generateStampSVG(
  stamp: IStamp,
  values: StampValues = {}
): string {
  const { shape, text, fields, style, template = "standard", svgTemplate = "" } = stamp;
  const { color, opacity, rotation, fontSize = 18, wordPadding = 0 } = style;
  const smallFontSize = Math.max(fontSize - 4, 8);

  if (template === "uploaded-svg" && svgTemplate) {
    const resolvedDate = values.date || new Date().toLocaleDateString("en-GB");
    const resolvedEmail = values.email || "info@company.com";
    const resolvedPoBox = values.poBox || "P.O. Box 123-00100";
    const resolvedUser = values.user || "Admin User";

    const substituted = svgTemplate
      .replace(/\{\{\s*date\s*\}\}|\{\{\s*DATE\s*\}\}|__DATE__|\[DATE\]/g, resolvedDate)
      .replace(/\{\{\s*email\s*\}\}|\{\{\s*EMAIL\s*\}\}|__EMAIL__|\[EMAIL\]/g, resolvedEmail)
      .replace(/\{\{\s*poBox\s*\}\}|\{\{\s*PO_BOX\s*\}\}|__PO_BOX__|\[PO_BOX\]/g, resolvedPoBox)
      .replace(/\{\{\s*user\s*\}\}|\{\{\s*USER\s*\}\}|__USER__|\[USER\]/g, resolvedUser);
    
    return sanitizeSVG(substituted);
  }

  if (template === "sample-classic") {
    const topLine = text || "COMPANY STAMP";
    const dateLine = values.date || new Date().toLocaleDateString("en-GB");
    const poBoxLine = values.poBox || "P.O. Box 123-00100";
    const emailLine = values.email || "info@company.com";

    return `
      <svg 
        viewBox="0 0 200 120" 
        xmlns="http://www.w3.org/2000/svg"
        width="200"
        height="120"
      >
        <g opacity="${opacity}" transform="rotate(${rotation} 100 60)">
          <rect x="4" y="4" width="192" height="112" rx="6" ry="6" fill="none" stroke="${color}" stroke-width="3"/>
          <rect x="8" y="8" width="184" height="104" rx="4" ry="4" fill="none" stroke="${color}" stroke-width="1"/>
          <line x1="12" y1="30" x2="188" y2="30" stroke="${color}" stroke-width="1"/>
          <line x1="12" y1="58" x2="188" y2="58" stroke="${color}" stroke-width="1"/>
          <line x1="12" y1="84" x2="188" y2="84" stroke="${color}" stroke-width="1"/>

          <text x="100" y="20" text-anchor="middle" fill="${color}" font-size="9" font-family="Arial, sans-serif" letter-spacing="${Math.max(wordPadding * 0.4, 0)}" font-weight="700">
            ${topLine}
          </text>

          <text x="100" y="49" text-anchor="middle" fill="${color}" font-size="${Math.max(fontSize, 14)}" font-family="Arial, sans-serif" letter-spacing="${Math.max(wordPadding * 0.4, 0)}" font-weight="700">
            ${dateLine}
          </text>

          <text x="100" y="76" text-anchor="middle" fill="${color}" font-size="8" font-family="Arial, sans-serif" letter-spacing="${Math.max(wordPadding * 0.3, 0)}" font-weight="500">
            ${poBoxLine}
          </text>

          <text x="100" y="102" text-anchor="middle" fill="${color}" font-size="8" font-family="Arial, sans-serif" letter-spacing="${Math.max(wordPadding * 0.3, 0)}" font-weight="500">
            ${emailLine}
          </text>
        </g>
      </svg>
    `.trim();
  }

  let shapeElement = "";

  if (shape === "circle") {
    shapeElement = `
      <circle 
        cx="100" cy="100" r="90" 
        stroke="${color}" 
        fill="none" 
        stroke-width="4"
      />
      <circle 
        cx="100" cy="100" r="88" 
        stroke="${color}" 
        fill="none" 
        stroke-width="1"
      />
    `;
  } else if (shape === "rectangle") {
    shapeElement = `
      <rect 
        x="15" y="50" width="170" height="100" 
        stroke="${color}" 
        fill="none" 
        stroke-width="3"
        rx="8"
      />
    `;
  } else if (shape === "badge") {
    shapeElement = `
      <ellipse 
        cx="100" cy="100" rx="95" ry="80" 
        stroke="${color}" 
        fill="none" 
        stroke-width="3"
      />
    `;
  }

  let contentY = 90;
  let dynamicContentStartY = 115;

  let dynamicContent = "";

  if (fields.date && values.date) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="${smallFontSize}" 
        font-family="Arial, sans-serif"
        font-weight="300"
      >
        ${values.date}
      </text>
    `;
    dynamicContentStartY += smallFontSize + 2;
  }

  if (fields.user && values.user) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="${smallFontSize}" 
        font-family="Arial, sans-serif"
        font-weight="300"
      >
        ${values.user}
      </text>
    `;
    dynamicContentStartY += smallFontSize + 2;
  }

  if (fields.stampId && values.stampId) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="${8}" 
        font-family="Arial, sans-serif"
        font-weight="300"
        opacity="0.7"
      >
        ID: ${values.stampId}
      </text>
    `;
    dynamicContentStartY += smallFontSize + 2;
  }

  if (fields.poBox && values.poBox) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="${smallFontSize}" 
        font-family="Arial, sans-serif"
        font-weight="300"
      >
        ${values.poBox}
      </text>
    `;
    dynamicContentStartY += smallFontSize + 2;
  }

  if (fields.email && values.email) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="${smallFontSize}" 
        font-family="Arial, sans-serif"
        font-weight="300"
      >
        ${values.email}
      </text>
    `;
  }

  const svg = `
    <svg 
      viewBox="0 0 200 200" 
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
    >
      <g 
        opacity="${opacity}" 
        transform="rotate(${rotation} 100 100)"
      >
        ${shapeElement}
        <text 
          x="100" y="${contentY}" 
          text-anchor="middle" 
          fill="${color}" 
          font-size="${fontSize}" 
          letter-spacing="${wordPadding}"
          word-spacing="${wordPadding}"
          font-weight="bold"
          font-family="Arial, sans-serif"
        >
          ${text}
        </text>
        ${dynamicContent}
      </g>
    </svg>
  `;

  return svg.trim();
}

/**
 * Generate preview SVG for stamp builder
 */
export function generateStampPreviewSVG(
  stamp: Partial<IStamp>
): string {
  const {
    shape = "circle",
    text = "COMPANY STAMP",
    fields = { date: true, user: true, stampId: false, poBox: false, email: false },
    style = {
      color: "#8B0000",
      opacity: 0.2,
      rotation: 12,
      fontSize: 18,
      wordPadding: 0,
    },
  } = stamp;

  const today = new Date().toLocaleDateString("en-GB");
  const currentUser = "Admin User";

  return generateStampSVG(
    {
      shape: shape as "circle" | "rectangle" | "badge",
      text,
      fields,
      style,
    } as IStamp,
    {
      date: today,
      user: currentUser,
      stampId: "STM-12345",
      poBox: "P.O. Box 123-00100",
      email: "info@company.com",
    }
  );
}

/**
 * Validate stamp configuration
 */
export function validateStampConfig(stamp: Partial<IStamp>): string[] {
  const errors: string[] = [];

  const template = stamp.template || "standard";

  if (!stamp.name || stamp.name.trim().length === 0) {
    errors.push("Stamp name is required");
  }

  if (template !== "uploaded-svg" && (!stamp.text || stamp.text.trim().length === 0)) {
    errors.push("Stamp text is required");
  }

  if (template !== "uploaded-svg" && stamp.text && stamp.text.length > 50) {
    errors.push("Stamp text cannot exceed 50 characters");
  }

  if (template !== "uploaded-svg" && (!stamp.shape || !["circle", "rectangle", "badge"].includes(stamp.shape))) {
    errors.push("Invalid shape");
  }

  if (template === "uploaded-svg") {
    const svgContent = (stamp.svgTemplate || "").trim().toLowerCase();
    if (!svgContent || !svgContent.includes("<svg")) {
      errors.push("Uploaded SVG template is required and must be a valid SVG");
    }
  }

  if (template !== "uploaded-svg") {
    const style = stamp.style;
    if (!style) {
      errors.push("Style configuration is required");
    } else {
      const { color, opacity, rotation, wordPadding = 0 } = style;

      if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
        errors.push("Invalid color format (use hex: #RRGGBB)");
      }

      if (opacity < 0 || opacity > 1) {
        errors.push("Opacity must be between 0 and 1");
      }

      if (rotation < 0 || rotation > 20) {
        errors.push("Rotation must be between 0 and 20 degrees");
      }

      if (wordPadding < 0 || wordPadding > 20) {
        errors.push("Word padding must be between 0 and 20");
      }
    }
  }

  return errors;
}
