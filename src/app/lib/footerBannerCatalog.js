import { ProfileAssets } from "@/app/UI/home/ReadmeShowcaseTemplates/ProfileAssets/ProfileAssets";

export const FOOTER_BANNER_STRIP_WIDTH = 1600;
export const FOOTER_BANNER_STRIP_HEIGHT = 240;
export const FOOTER_BANNER_ASSET_EXTENSION = "svg";

export const FOOTER_BANNER_ITEMS = [
  {
    id: "banner-1",
    title: "Banner 01",
    image: ProfileAssets.BannerImg1,
    extension: "jpeg",
    mimeType: "image/jpeg",
    alt: "Footer banner 01",
  },
  {
    id: "banner-2",
    title: "Banner 02",
    image: ProfileAssets.BannerImg2,
    extension: "jpeg",
    mimeType: "image/jpeg",
    alt: "Footer banner 02",
  },
  {
    id: "banner-3",
    title: "Banner 03",
    image: ProfileAssets.BannerImg3,
    extension: "gif",
    mimeType: "image/gif",
    alt: "Footer banner 03",
  },
  {
    id: "banner-4",
    title: "Banner 04",
    image: ProfileAssets.BannerImg4,
    extension: "jpeg",
    mimeType: "image/jpeg",
    alt: "Footer banner 04",
  },
  {
    id: "banner-5",
    title: "Banner 05",
    image: ProfileAssets.BannerImg5,
    extension: "jpeg",
    mimeType: "image/jpeg",
    alt: "Footer banner 05",
  },
  {
    id: "banner-6",
    title: "Banner 06",
    image: ProfileAssets.BannerImg6,
    extension: "png",
    mimeType: "image/png",
    alt: "Footer banner 06",
  },
  {
    id: "banner-7",
    title: "Banner 07",
    image: ProfileAssets.BannerImg7,
    extension: "png",
    mimeType: "image/png",
    alt: "Footer banner 07",
  },
];

const FOOTER_BANNER_BY_ID = new Map(
  FOOTER_BANNER_ITEMS.map((entry) => [entry.id, entry])
);

function normalizeAssetSeed(value, fallback = "footer") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || fallback;
}

export function normalizeFooterBannerId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (FOOTER_BANNER_BY_ID.has(normalized)) {
    return normalized;
  }

  return FOOTER_BANNER_ITEMS[0]?.id || "banner-1";
}

export function getFooterBannerById(value) {
  return FOOTER_BANNER_BY_ID.get(normalizeFooterBannerId(value)) || null;
}

export function normalizeFooterAssetPathValue(value) {
  return String(value || "")
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

export function buildFooterAssetPath(itemId, bannerId) {
  const banner = getFooterBannerById(bannerId);
  const safeItemId = normalizeAssetSeed(itemId, "footer");
  const safeBannerId = normalizeAssetSeed(banner?.id, "banner");

  return `assets/readme/footer-strip-${safeBannerId}-${safeItemId}.${FOOTER_BANNER_ASSET_EXTENSION}`;
}

export function resolveFooterAssetPath(value, { itemId = "", bannerId = "" } = {}) {
  const normalized = normalizeFooterAssetPathValue(value);
  if (normalized) {
    return normalized;
  }

  return buildFooterAssetPath(itemId, bannerId);
}
