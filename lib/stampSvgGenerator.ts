/**
 * Client-side stamp SVG generator
 * Generates stamp previews instantly without API calls
 */

export interface StampConfig {
  template?: "standard" | "sample-classic" | "uploaded-svg";
  svgTemplate?: string;
  shape: "circle" | "rectangle" | "badge";
  text: string;
  fields: {
    date: boolean;
    user: boolean;
    stampId: boolean;
    poBox: boolean;
    email: boolean;
  };
  style: {
    color: string;
    opacity: number;
    rotation: number;
    fontSize?: number;
    wordPadding?: number;
  };
}

/**
 * Generate stamp SVG on the client side
 */
export function generateClientStampSVG(config: StampConfig): string {
  const { shape, text, fields, style, template = "standard", svgTemplate = "" } = config;
  const { color, opacity, rotation, fontSize = 18, wordPadding = 0 } = style;
  const smallFontSize = Math.max(fontSize - 4, 8);

  // Get current date
  const today = new Date().toLocaleDateString("en-GB");
  const currentUser = "Admin User";

  if (template === "uploaded-svg" && svgTemplate) {
    return svgTemplate
      .replace(/\{\{\s*date\s*\}\}|\{\{\s*DATE\s*\}\}|__DATE__|\[DATE\]/g, today)
      .replace(/\{\{\s*email\s*\}\}|\{\{\s*EMAIL\s*\}\}|__EMAIL__|\[EMAIL\]/g, "info@company.com")
      .replace(/\{\{\s*poBox\s*\}\}|\{\{\s*PO_BOX\s*\}\}|__PO_BOX__|\[PO_BOX\]/g, "P.O. Box 123-00100")
      .replace(/\{\{\s*user\s*\}\}|\{\{\s*USER\s*\}\}|__USER__|\[USER\]/g, currentUser);
  }

  if (template === "sample-classic") {
    const topLine = text || "COMPANY STAMP";
    const dateLine = today;
    const poBoxLine = "P.O. Box 123-00100";
    const emailLine = "info@company.com";

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
        opacity="0.5"
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

  if (fields.date) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="${smallFontSize}" 
        font-family="Arial, sans-serif"
        font-weight="300"
      >
        ${today}
      </text>
    `;
    dynamicContentStartY += smallFontSize + 2;
  }

  if (fields.user) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="${smallFontSize}" 
        font-family="Arial, sans-serif"
        font-weight="300"
      >
        ${currentUser}
      </text>
    `;
    dynamicContentStartY += smallFontSize + 2;
  }

  if (fields.stampId) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="8" 
        font-family="Arial, sans-serif"
        font-weight="300"
        opacity="0.7"
      >
        ID: STM-12345
      </text>
    `;
    dynamicContentStartY += smallFontSize + 2;
  }

  if (fields.poBox) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="${smallFontSize}" 
        font-family="Arial, sans-serif"
        font-weight="300"
      >
        P.O. Box 123-00100
      </text>
    `;
    dynamicContentStartY += smallFontSize + 2;
  }

  if (fields.email) {
    dynamicContent += `
      <text 
        x="100" y="${dynamicContentStartY}" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="${smallFontSize}" 
        font-family="Arial, sans-serif"
        font-weight="300"
      >
        info@company.com
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
      <defs>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
        </style>
      </defs>
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

export default generateClientStampSVG;
