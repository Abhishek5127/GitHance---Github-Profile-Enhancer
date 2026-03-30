import {
  FOOTER_BANNER_STRIP_HEIGHT,
  FOOTER_BANNER_STRIP_WIDTH,
} from "@/app/lib/footerBannerCatalog";

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncateLabel(value, maxLength = 28) {
  const normalized = String(value || "").trim();
  if (!normalized) return "Footer Banner";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

export function buildFooterBannerSvg({
  imageHref = "",
  title = "Footer Banner",
  alt = "Footer banner",
  width = FOOTER_BANNER_STRIP_WIDTH,
  height = FOOTER_BANNER_STRIP_HEIGHT,
} = {}) {
  const safeImageHref = escapeXml(imageHref);
  const safeTitle = escapeXml(truncateLabel(title, 30));
  const safeAlt = escapeXml(alt || title || "Footer banner");
  const badgeWidth = 220;
  const badgeHeight = 48;
  const badgeX = width - 72 - badgeWidth;
  const badgeY = height - 74;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${safeAlt}">
  <defs>
    <clipPath id="footer-strip-clip">
      <rect width="${width}" height="${height}" rx="28" ry="28" />
    </clipPath>
    <linearGradient id="footer-strip-overlay" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.72" />
      <stop offset="50%" stop-color="#000000" stop-opacity="0.28" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55" />
    </linearGradient>
    <linearGradient id="footer-strip-shine" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.38" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="28" ry="28" fill="#0f1115" />
  <g clip-path="url(#footer-strip-clip)">
    ${safeImageHref ? `<image href="${safeImageHref}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" />` : "<rect width=\"100%\" height=\"100%\" fill=\"#0f1115\" />"}
    <rect width="${width}" height="${height}" fill="url(#footer-strip-overlay)" />
    <rect width="${width}" height="${height}" fill="url(#footer-strip-shine)" />
  </g>
  <rect x="1.5" y="1.5" width="${width - 3}" height="${height - 3}" rx="26.5" ry="26.5" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="3" />
  <text x="72" y="${height - 92}" fill="rgba(255,255,255,0.58)" font-size="18" font-weight="700" letter-spacing="4.4" font-family="Arial, Helvetica, sans-serif">FOOTER BANNER</text>
  <text x="72" y="${height - 48}" fill="#ffffff" font-size="34" font-weight="700" font-family="Arial, Helvetica, sans-serif">${safeTitle}</text>
  <rect x="${badgeX}" y="${badgeY}" width="${badgeWidth}" height="${badgeHeight}" rx="24" ry="24" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.14)" stroke-width="2" />
  <text x="${badgeX + badgeWidth / 2}" y="${badgeY + 31}" text-anchor="middle" fill="rgba(255,255,255,0.72)" font-size="18" font-weight="700" letter-spacing="2.8" font-family="Arial, Helvetica, sans-serif">README ASSET</text>
</svg>`;
}
