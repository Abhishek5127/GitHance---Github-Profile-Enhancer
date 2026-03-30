"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import LockIcon from "@/app/components/billing/LockIcon";
import { useBilling } from "@/app/components/billing/BillingProvider";
import generateMarkdown from "../lib/genrateMarkdown";
import HeaderVariantPicker from "../components/pickers/HeaderVariantPicker";
import BioVariantPicker from "../components/pickers/BioVariantPicker";
import TechStackVariantPicker from "../components/pickers/TechStackVariantPicker";
import RepoCommitVariantPicker from "../components/pickers/RepoCommitVariantPicker";
import SectionVariantPicker from "../components/pickers/SectionVariantPicker";
import ContributionGraphVariantPicker from "../components/pickers/ContributionGraphVariantPicker";
import FooterVariantPicker from "../components/pickers/FooterVariantPicker";
import StickerPicker from "../components/pickers/StickerPicker";
import SafeImage from "../components/seo/SafeImage";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  closestCorners,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import Sidebar from "../components/sidebar/Sidebar";
import Canvas from "../components/canvas/Canvas";
import { buildTechStackPayload } from "../lib/techStackCatalog";
import { REPO_COMMIT_STAT_ITEMS } from "../lib/repoCommitCatalog";
import { resolveProfileBuilderUsername } from "../lib/profileComponents";
import {
  getSectionVariantById,
  parseSectionSlotDropId,
} from "../lib/sectionCatalog";
import {
  CONTRIBUTION_GRAPH_ASSET_PATH,
  CONTRIBUTION_GRAPH_CONFIG_PATH,
  CONTRIBUTION_GRAPH_MONTHLY_ASSET_PATH,
  CONTRIBUTION_GRAPH_WORKFLOW_PATH,
  CONTRIBUTION_GRAPH_SCRIPT_PATH,
  buildContributionGraphWorkflow,
  buildContributionGraphUpdaterScript,
} from "../lib/contributionGraphAssets";
import {
  canItemAcceptStickers,
  getStickerById,
  normalizeStickerAssignments,
  normalizeStickerLayers,
  parseStickerDropId,
  parseStickerSurfaceDropId,
} from "../lib/stickerCatalog";
import {
  normalizeContributionRange,
  normalizeContributionVariant,
  renderContributionHeatmapSvg,
} from "../lib/renderers/contributionHeatmapSvg";
import {
  FOOTER_BANNER_ITEMS,
  buildFooterAssetPath,
  getFooterBannerById,
  normalizeFooterAssetPathValue,
} from "../lib/footerBannerCatalog";

const PROFILE_BUILDER_DRAFT_STORAGE_KEY = "githance:profile-builder:draft:v1";
const CONTRIBUTION_DEFAULT_VARIANT = "classic";
const CONTRIBUTION_DEFAULT_RANGE = "yearly";
const CONTRIBUTION_SNAPSHOT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

const collisionDetectionStrategy = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length) {
    const stickerSlotCollisions = pointerCollisions.filter((collision) =>
      String(collision?.id || "").startsWith("sticker-slot:")
    );
    if (stickerSlotCollisions.length) {
      return stickerSlotCollisions;
    }

    const stickerSurfaceCollisions = pointerCollisions.filter((collision) =>
      String(collision?.id || "").startsWith("sticker-surface:")
    );
    if (stickerSurfaceCollisions.length) {
      return stickerSurfaceCollisions;
    }

    const sectionSlotCollisions = pointerCollisions.filter((collision) =>
      String(collision?.id || "").startsWith("section-slot:")
    );
    if (sectionSlotCollisions.length) {
      return sectionSlotCollisions;
    }

    return pointerCollisions;
  }

  const centerCollisions = closestCenter(args);
  if (centerCollisions.length) {
    return centerCollisions;
  }

  return closestCorners(args);
};

export default function Page() {
  const { data: session, status } = useSession();
  const { isPro, loading: billingLoading, refreshBilling, subscription } = useBilling();
  const bioDefaults = {
    content: `## About Me

I build modern web apps, experiment with AI tooling, and care about great DX.

- Next.js
- AI tooling
- Design systems`,
  };
  const techStackDefaults = buildTechStackPayload({
    variant: "categorized",
    alignment: "left",
    items: [
      { id: "javascript" },
      { id: "typescript" },
      { id: "react" },
      { id: "nextjs" },
      { id: "nodejs" },
      { id: "tailwindcss" },
      { id: "postgresql" },
      { id: "git" },
    ],
  });
  const defaultFooterBannerId = FOOTER_BANNER_ITEMS[0]?.id || "banner-1";

  const [canvasItems, setCanvasItems] = useState([]);
  const [readme, setReadme] = useState("");
  const [markdownPreview, setMarkdownPreview] = useState("");
  const [activeBlock, setActiveBlock] = useState(null);
  const [showHeaderPicker, setShowHeaderPicker] = useState(false);
  const [headerPickerContext, setHeaderPickerContext] = useState({
    itemId: null,
    initialVariant: null,
    initialData: null,
    pickerKey: 0,
  });
  const [showBioPicker, setShowBioPicker] = useState(false);
  const [bioPickerContext, setBioPickerContext] = useState({
    itemId: null,
    initialData: null,
    pickerKey: 0,
  });
  const [showTechStackPicker, setShowTechStackPicker] = useState(false);
  const [techStackPickerContext, setTechStackPickerContext] = useState({
    itemId: null,
    initialData: null,
    pickerKey: 0,
  });
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [sectionPickerContext, setSectionPickerContext] = useState({
    itemId: null,
    initialVariantId: null,
    pickerKey: 0,
  });
  const [showRepoCommitPicker, setShowRepoCommitPicker] = useState(false);
  const [repoCommitPickerContext, setRepoCommitPickerContext] = useState({
    itemId: null,
    initialItemIds: [],
    pickerKey: 0,
  });
  const [showContributionPicker, setShowContributionPicker] = useState(false);
  const [showFooterPicker, setShowFooterPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [activeStickerId, setActiveStickerId] = useState("");
  const [showMobileLibrary, setShowMobileLibrary] = useState(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [contributionPickerContext, setContributionPickerContext] = useState({
    itemId: null,
    initialData: null,
    pickerKey: 0,
  });
  const [footerPickerContext, setFooterPickerContext] = useState({
    itemId: null,
    initialData: null,
    pickerKey: 0,
  });
  const token = session?.accessToken;
  const sessionUsername = resolveProfileBuilderUsername(session?.username);
  const resolveCanvasUsername = (value = "") =>
    resolveProfileBuilderUsername(value, sessionUsername);
  const [markdown, setMarkdown] = useState([]);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState({ tone: "info", message: "" });
  const isAuthenticated =
    status === "authenticated" && Boolean(sessionUsername) && Boolean(token);

  useEffect(() => {
    if (billingLoading) return;
    if (!isPro) {
      setAutoUpdateEnabled(false);
      return;
    }

    setAutoUpdateEnabled(Boolean(subscription?.autoUpdateEnabled));
  }, [billingLoading, isPro, subscription?.autoUpdateEnabled]);

  const bootstrapCommitStatsSnapshot = async (username, installationId = null) => {
    if (!username || !token) return null;

    try {
      const response = await fetch("/api/github/stats/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          token,
          installationId,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok || !data?.stats) {
        return null;
      }

      return data.stats;
    } catch {
      return null;
    }
  };

  const collectCanvasItemsDeep = (items, predicate) => {
    const matches = [];

    const visit = (entry) => {
      if (!entry || typeof entry !== "object") return;
      if (typeof predicate === "function" && predicate(entry)) {
        matches.push(entry);
      }

      if (entry.type !== "section") return;
      const slots = Array.isArray(entry?.data?.slots) ? entry.data.slots : [];
      slots.forEach(visit);
    };

    (Array.isArray(items) ? items : []).forEach(visit);
    return matches;
  };

  const mapCanvasItemDeep = (entry, mapper) => {
    if (!entry || typeof entry !== "object") return entry;

    let nextEntry = typeof mapper === "function" ? mapper(entry) : entry;
    if (!nextEntry || typeof nextEntry !== "object") {
      return entry;
    }

    if (nextEntry.type !== "section") {
      return nextEntry;
    }

    const slots = Array.isArray(nextEntry?.data?.slots) ? nextEntry.data.slots : [];
    let slotChanged = false;
    const nextSlots = slots.map((slotItem) => {
      const mappedSlot = mapCanvasItemDeep(slotItem, mapper);
      if (mappedSlot !== slotItem) {
        slotChanged = true;
      }
      return mappedSlot;
    });

    if (!slotChanged) {
      return nextEntry;
    }

    return {
      ...nextEntry,
      data: {
        ...nextEntry.data,
        slots: nextSlots,
      },
    };
  };

  const mapCanvasItemsDeep = (items, mapper) => {
    if (!Array.isArray(items)) return [];

    let changed = false;
    const mappedItems = items.map((entry) => {
      const mappedEntry = mapCanvasItemDeep(entry, mapper);
      if (mappedEntry !== entry) {
        changed = true;
      }
      return mappedEntry;
    });

    return changed ? mappedItems : items;
  };

  const normalizeContributionAssetPathValue = (value) =>
    String(value || "")
      .trim()
      .replaceAll("\\", "/")
      .replace(/^\.\//, "")
      .replace(/^\/+/, "");

  const sanitizeAssetSeed = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const buildContributionAssetPath = (itemId, range, attempt = 0) => {
    const normalizedRange = normalizeContributionRange(range);
    const safeId = sanitizeAssetSeed(itemId) || "graph";
    const base = `assets/readme/contribution-graph-${normalizedRange}-${safeId}`;
    const suffix = attempt > 0 ? `-${attempt + 1}` : "";
    return `${base}${suffix}.svg`;
  };

  const ensureUniqueContributionAssetPaths = (items) => {
    const usedPaths = new Set();

    return mapCanvasItemsDeep(items, (entry) => {
      if (entry.type !== "contribution") return entry;

      const normalizedRange = normalizeContributionRange(
        entry?.data?.range || CONTRIBUTION_DEFAULT_RANGE
      );
      const normalizedVariant = normalizeContributionVariant(
        entry?.data?.variant || CONTRIBUTION_DEFAULT_VARIANT
      );
      const currentPath = normalizeContributionAssetPathValue(entry?.data?.assetPath);
      const isLegacyDefaultPath =
        currentPath === CONTRIBUTION_GRAPH_ASSET_PATH ||
        currentPath === CONTRIBUTION_GRAPH_MONTHLY_ASSET_PATH;

      let nextPath =
        !currentPath || isLegacyDefaultPath
          ? buildContributionAssetPath(entry.id, normalizedRange, 0)
          : currentPath;
      let attempt = 0;

      while (usedPaths.has(nextPath.toLowerCase())) {
        attempt += 1;
        nextPath = buildContributionAssetPath(entry.id, normalizedRange, attempt);
      }

      usedPaths.add(nextPath.toLowerCase());

      if (
        nextPath === currentPath &&
        normalizedRange === normalizeContributionRange(entry?.data?.range) &&
        normalizedVariant === normalizeContributionVariant(entry?.data?.variant)
      ) {
        return entry;
      }

      return {
        ...entry,
        data: {
          ...entry.data,
          variant: normalizedVariant,
          range: normalizedRange,
          assetPath: nextPath,
        },
      };
    });
  };

  const ensureFooterAssetPaths = (items) =>
    mapCanvasItemsDeep(items, (entry) => {
      if (entry.type !== "footer") return entry;

      const banner = getFooterBannerById(entry?.data?.bannerId || defaultFooterBannerId);
      const nextBannerId = banner?.id || defaultFooterBannerId;
      const currentPath = normalizeFooterAssetPathValue(entry?.data?.assetPath);
      const nextPath = currentPath || buildFooterAssetPath(entry.id, nextBannerId);

      if (
        nextBannerId === String(entry?.data?.bannerId || "").trim().toLowerCase() &&
        nextPath === currentPath
      ) {
        return entry;
      }

      return {
        ...entry,
        data: {
          ...entry.data,
          bannerId: nextBannerId,
          assetPath: nextPath,
        },
      };
    });

  const enrichCommitBlocks = async (items) => {
    const commitBlocks = collectCanvasItemsDeep(
      items,
      (item) => item.type === "commitStat" || item.type === "commits"
    );
    if (!commitBlocks.length) return items;

    const statsByIdentity = new Map();

    await Promise.all(
      commitBlocks.map(async (item) => {
        const username = resolveCanvasUsername(item?.data?.username);
        const installationId = Number(item?.data?.installationId || 0) || null;
        const identityKey = `${username}:${installationId ?? "auto"}`;
        if (!username || statsByIdentity.has(identityKey)) return;

        const snapshot = await bootstrapCommitStatsSnapshot(username, installationId);
        if (snapshot) {
          statsByIdentity.set(identityKey, snapshot);
        }
      })
    );

    return mapCanvasItemsDeep(items, (entry) => {
      if (entry.type !== "commitStat" && entry.type !== "commits") return entry;

      const username = resolveCanvasUsername(entry?.data?.username);
      const installationId = Number(entry?.data?.installationId || 0) || null;
      const identityKey = `${username}:${installationId ?? "auto"}`;
      const snapshot = statsByIdentity.get(identityKey);
      if (!snapshot) return entry;

      return {
        ...entry,
        data: {
          ...entry.data,
          username,
          statsSnapshot: snapshot,
          installationId: Number(snapshot?.installation_id || entry?.data?.installationId || 0) || null,
        },
      };
    });
  };

  const hasContributionSnapshot = (snapshot) => {
    if (!snapshot || !Array.isArray(snapshot.days) || !snapshot.days.length) {
      return false;
    }

    const fetchedAt = new Date(String(snapshot?.fetchedAt || ""));
    if (Number.isNaN(fetchedAt.getTime())) return false;
    return Date.now() - fetchedAt.getTime() <= CONTRIBUTION_SNAPSHOT_MAX_AGE_MS;
  };

  const bootstrapContributionSnapshot = async (username) => {
    if (!username) return null;

    try {
      const response = await fetch("/api/github/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        return null;
      }

      return {
        username: String(data?.username || username).trim().toLowerCase(),
        totalContributions: Number(data?.totalContributions || 0),
        days: Array.isArray(data?.days) ? data.days : [],
        fetchedAt: String(data?.fetchedAt || new Date().toISOString()),
      };
    } catch {
      return null;
    }
  };

  const loadStickerDataUri = async (stickerId) => {
    const normalizedStickerId = String(stickerId || "").trim();
    if (!normalizedStickerId) return "";

    const sticker = getStickerById(normalizedStickerId);
    const stickerPath = String(sticker?.assetPath || "").trim();
    if (!stickerPath) return "";

    try {
      const response = await fetch(stickerPath, { cache: "force-cache" });
      if (!response.ok) return "";
      const contentType = String(response.headers.get("content-type") || "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      const lowerPath = stickerPath.toLowerCase();
      const isSvg = contentType === "image/svg+xml" || lowerPath.endsWith(".svg");

      if (isSvg) {
        const raw = await response.text();
        return `data:image/svg+xml;utf8,${encodeURIComponent(raw)}`;
      }

      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const chunkSize = 0x8000;
      let binary = "";

      for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
      }

      const inferredType = lowerPath.endsWith(".png")
        ? "image/png"
        : lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")
          ? "image/jpeg"
          : lowerPath.endsWith(".webp")
            ? "image/webp"
            : "application/octet-stream";
      const mimeType = contentType || inferredType;
      const base64 = btoa(binary);

      return `data:${mimeType};base64,${base64}`;
    } catch {
      return "";
    }
  };

  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";

    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }

    return btoa(binary);
  };

  const loadFooterBannerFileData = async (bannerId) => {
    const banner = getFooterBannerById(bannerId);
    const bannerSrc = typeof banner?.image === "string" ? banner.image : banner?.image?.src;
    if (!banner?.id || !bannerSrc) return null;

    try {
      const response = await fetch(bannerSrc, { cache: "force-cache" });
      if (!response.ok) return null;

      const buffer = await response.arrayBuffer();
      return {
        content: arrayBufferToBase64(buffer),
        encoding: "base64",
        title: banner.title,
      };
    } catch {
      return null;
    }
  };

  const buildStickerHrefMapForAssignments = async (stickers) => {
    const normalizedStickers = normalizeStickerAssignments(stickers);
    const stickerIds = [...new Set(Object.values(normalizedStickers).filter(Boolean))];
    if (!stickerIds.length) return {};

    const hrefEntries = await Promise.all(
      stickerIds.map(async (stickerId) => {
        const href = await loadStickerDataUri(stickerId);
        return [stickerId, href];
      })
    );

    return Object.fromEntries(hrefEntries.filter(([, href]) => Boolean(href)));
  };

  const buildStickerHrefMapForLayers = async (layers) => {
    const normalizedLayers = normalizeStickerLayers(layers);
    const stickerIds = [...new Set(normalizedLayers.map((layer) => layer.stickerId).filter(Boolean))];
    if (!stickerIds.length) return {};

    const hrefEntries = await Promise.all(
      stickerIds.map(async (stickerId) => {
        const href = await loadStickerDataUri(stickerId);
        return [stickerId, href];
      })
    );

    return Object.fromEntries(hrefEntries.filter(([, href]) => Boolean(href)));
  };

  const enrichContributionBlocks = async (items) => {
    const contributionBlocks = collectCanvasItemsDeep(
      items,
      (item) => item.type === "contribution"
    );
    if (!contributionBlocks.length) return items;

    const snapshotsByUser = new Map();

    await Promise.all(
      contributionBlocks.map(async (item) => {
        const username = resolveCanvasUsername(item?.data?.username);
        if (!username || snapshotsByUser.has(username)) return;

        const existingSnapshot = item?.data?.contributionSnapshot || null;
        if (hasContributionSnapshot(existingSnapshot)) {
          snapshotsByUser.set(username, existingSnapshot);
          return;
        }

        const snapshot = await bootstrapContributionSnapshot(username);
        if (hasContributionSnapshot(snapshot)) {
          snapshotsByUser.set(username, snapshot);
        }
      })
    );

    return mapCanvasItemsDeep(items, (entry) => {
      if (entry.type !== "contribution") return entry;

      const username = resolveCanvasUsername(entry?.data?.username);
      const existingSnapshot = entry?.data?.contributionSnapshot || null;
      const contributionSnapshot = hasContributionSnapshot(existingSnapshot)
        ? existingSnapshot
        : snapshotsByUser.get(username) || null;
      const range = normalizeContributionRange(entry?.data?.range);
      const existingAssetPath = normalizeContributionAssetPathValue(entry?.data?.assetPath);
      const assetPath =
        existingAssetPath || buildContributionAssetPath(entry.id, range, 0);

      return {
        ...entry,
        data: {
          ...entry.data,
          username,
          variant: normalizeContributionVariant(entry?.data?.variant),
          range,
          assetPath,
          ...(contributionSnapshot ? { contributionSnapshot } : {}),
        },
      };
    });
  };

  const updateProfileReadme = async () => {
    setPublishFeedback({ tone: "info", message: "" });

    if (status !== "authenticated" || !sessionUsername || !token) {
      await signIn("github", { callbackUrl: "/profile-builder" });
      return;
    }

    const commitEnrichedItems = await enrichCommitBlocks(canvasItems);
    const contributionEnrichedItems = await enrichContributionBlocks(commitEnrichedItems);
    const footerEnrichedItems = ensureFooterAssetPaths(contributionEnrichedItems);
    const enrichedItems = ensureUniqueContributionAssetPaths(footerEnrichedItems);
    setCanvasItems(enrichedItems);

    const latestMarkdown = generateMarkdown(enrichedItems);
    setMarkdown(latestMarkdown);

    const contributionBlocks = collectCanvasItemsDeep(
      enrichedItems,
      (item) => item.type === "contribution"
    );
    const footerBlocks = collectCanvasItemsDeep(
      enrichedItems,
      (item) => item.type === "footer"
    );
    const shouldEnableAutoUpdate = Boolean(
      autoUpdateEnabled && isPro && contributionBlocks.length
    );
    const publishFileMap = new Map();
    const contributionGraphConfig = {
      version: 2,
      updatedAt: new Date().toISOString(),
      graphs: [],
    };

    const upsertPublishFile = (entry) => {
      if (!entry?.path) return;
      publishFileMap.set(entry.path, entry);
    };

    for (const contributionBlock of contributionBlocks) {
      const contributionUsername = resolveCanvasUsername(
        contributionBlock?.data?.username
      );
      const contributionVariant = normalizeContributionVariant(
        contributionBlock?.data?.variant || CONTRIBUTION_DEFAULT_VARIANT
      );
      const contributionRange = normalizeContributionRange(
        contributionBlock?.data?.range || CONTRIBUTION_DEFAULT_RANGE
      );
      const contributionAssetPath =
        String(contributionBlock?.data?.assetPath || "").trim() ||
        buildContributionAssetPath(contributionBlock?.id, contributionRange, 0);
      const contributionSnapshot = contributionBlock?.data?.contributionSnapshot || null;
      const contributionStickers = normalizeStickerAssignments(
        contributionBlock?.data?.stickers
      );
      const contributionStickerLayers = normalizeStickerLayers(
        contributionBlock?.data?.stickerLayers
      );

      if (!contributionUsername) continue;

      const [slotStickerHrefs, layerStickerHrefs] = await Promise.all([
        buildStickerHrefMapForAssignments(contributionStickers),
        buildStickerHrefMapForLayers(contributionStickerLayers),
      ]);
      const stickerHrefs = {
        ...slotStickerHrefs,
        ...layerStickerHrefs,
      };

      const contributionSvg = renderContributionHeatmapSvg({
        username: contributionUsername,
        days: Array.isArray(contributionSnapshot?.days)
          ? contributionSnapshot.days
          : [],
        variant: contributionVariant,
        range: contributionRange,
        stickers: contributionStickers,
        stickerLayers: contributionStickerLayers,
        stickerHrefs,
        title: "Contribution Graph",
        width: contributionRange === "monthly" ? 560 : 1120,
        height: contributionRange === "monthly" ? 228 : 320,
      });

      upsertPublishFile({
        path: contributionAssetPath,
        content: `${contributionSvg}\n`,
        encoding: "utf8",
        message: `chore(readme): refresh ${contributionRange} contribution graph asset`,
      });

      contributionGraphConfig.graphs.push({
        id: String(contributionBlock?.id || "").trim() || contributionAssetPath,
        username: contributionUsername,
        variant: contributionVariant,
        range: contributionRange,
        outputPath: contributionAssetPath,
        stickers: contributionStickers,
        stickerLayers: contributionStickerLayers,
        stickerHrefs,
      });
    }

    for (const footerBlock of footerBlocks) {
      const banner = getFooterBannerById(footerBlock?.data?.bannerId || defaultFooterBannerId);
      const footerAssetPath =
        normalizeFooterAssetPathValue(footerBlock?.data?.assetPath) ||
        buildFooterAssetPath(footerBlock?.id, banner?.id || defaultFooterBannerId);

      if (!banner?.id || !footerAssetPath) continue;

      const footerFile = await loadFooterBannerFileData(banner.id);
      if (!footerFile?.content) {
        setPublishFeedback({
          tone: "error",
          message: `Failed to prepare ${banner.title} for GitHub publishing.`,
        });
        return;
      }

      upsertPublishFile({
        path: footerAssetPath,
        content: footerFile.content,
        encoding: footerFile.encoding,
        message: `chore(readme): refresh ${banner.title.toLowerCase()} footer banner`,
      });
    }

    if (contributionBlocks.length && shouldEnableAutoUpdate) {
      upsertPublishFile({
        path: CONTRIBUTION_GRAPH_CONFIG_PATH,
        content: `${JSON.stringify(contributionGraphConfig, null, 2)}\n`,
        encoding: "utf8",
        message: "chore(readme): update contribution graph config",
      });

      upsertPublishFile({
        path: CONTRIBUTION_GRAPH_WORKFLOW_PATH,
        content: buildContributionGraphWorkflow({
          configPath: CONTRIBUTION_GRAPH_CONFIG_PATH,
          scriptPath: CONTRIBUTION_GRAPH_SCRIPT_PATH,
        }),
        encoding: "utf8",
        message: "chore(readme): configure contribution graph workflow",
      });

      upsertPublishFile({
        path: CONTRIBUTION_GRAPH_SCRIPT_PATH,
        content: buildContributionGraphUpdaterScript({
          configPath: CONTRIBUTION_GRAPH_CONFIG_PATH,
        }),
        encoding: "utf8",
        message: "chore(readme): add contribution graph generator script",
      });
    }

    const publishFiles = [...publishFileMap.values()];

    const res = await fetch("/api/publish-readme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: session.username,
        repo: session.username,
        readmeContent: latestMarkdown,
        files: publishFiles,
        autoUpdateEnabled: shouldEnableAutoUpdate,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      setPublishFeedback({
        tone: "error",
        message: data?.error || "Failed to publish README.",
      });
      return;
    }

    await refreshBilling();

    if (Array.isArray(data?.warnings) && data.warnings.length) {
      setPublishFeedback({
        tone: "info",
        message:
          "README published, but the auto-update workflow needs the GitHub workflow scope before it can run automatically.",
      });
      return;
    }

    if (autoUpdateEnabled && !contributionBlocks.length) {
      setPublishFeedback({
        tone: "info",
        message:
          "README published successfully. Add a contribution graph block if you want to enable auto-update workflows.",
      });
      return;
    }

    setPublishFeedback({
      tone: "success",
      message: shouldEnableAutoUpdate
        ? "README published and auto-update workflow configured."
        : "README published to GitHub successfully.",
    });
  };

  useEffect(() => {
    setMarkdown(generateMarkdown(canvasItems));
  }, [canvasItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawDraft = window.localStorage.getItem(PROFILE_BUILDER_DRAFT_STORAGE_KEY);
      if (!rawDraft) return;

      const parsedDraft = JSON.parse(rawDraft);
      if (!Array.isArray(parsedDraft?.items)) return;

      setCanvasItems(parsedDraft.items);
    } catch (error) {
      console.error("Failed to restore builder draft", error);
    } finally {
      setIsDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isDraftHydrated) return;

    try {
      window.localStorage.setItem(
        PROFILE_BUILDER_DRAFT_STORAGE_KEY,
        JSON.stringify({
          updatedAt: new Date().toISOString(),
          items: canvasItems,
        })
      );
    } catch (error) {
      console.error("Failed to save builder draft", error);
    }
  }, [canvasItems, isDraftHydrated]);

  useEffect(() => {
    if (!session?.username || !isDraftHydrated) return;

    if (canvasItems.length > 0) {
      setReadme("");
      return;
    }

    const fetchReadme = async () => {
      try {
        const res = await fetch("/api/Profile-Readme", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: session.username }),
        });

        const html = await res.text();
        setReadme(html);
      } catch (error) {
        console.error("Failed to fetch profile README", error);
      }
    };

    fetchReadme();
  }, [canvasItems.length, isDraftHydrated, session?.username]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor)
  );

  const handlePreview = () => {
    setMarkdownPreview(generateMarkdown(canvasItems));
  };

  const moveCanvasItemToSectionSlot = (draggedItemId, targetSectionId, targetSlotIndex) => {
    if (!draggedItemId || !targetSectionId || targetSlotIndex < 0) return;

    setCanvasItems((prev) => {
      let draggedItem = null;
      let changed = false;

      const withoutDragged = prev.flatMap((entry) => {
        if (entry.id === draggedItemId) {
          if (entry.type === "section") {
            return [entry];
          }
          draggedItem = entry;
          changed = true;
          return [];
        }

        if (entry.type !== "section") {
          return [entry];
        }

        const slots = Array.isArray(entry?.data?.slots) ? [...entry.data.slots] : [];
        let localChanged = false;

        for (let index = 0; index < slots.length; index += 1) {
          const slotItem = slots[index];
          if (slotItem?.id !== draggedItemId) continue;
          draggedItem = slotItem;
          slots[index] = null;
          localChanged = true;
          changed = true;
          break;
        }

        if (!localChanged) {
          return [entry];
        }

        return [
          {
            ...entry,
            data: {
              ...entry.data,
              slots,
            },
          },
        ];
      });

      if (!draggedItem || draggedItem.type === "section") {
        return prev;
      }

      let displacedItem = null;
      let placed = false;

      const withPlacement = withoutDragged.map((entry) => {
        if (entry.id !== targetSectionId || entry.type !== "section") {
          return entry;
        }

        const slots = Array.isArray(entry?.data?.slots) ? [...entry.data.slots] : [];
        if (targetSlotIndex >= slots.length) return entry;

        displacedItem = slots[targetSlotIndex] || null;
        slots[targetSlotIndex] = draggedItem;
        placed = true;
        changed = true;

        return {
          ...entry,
          data: {
            ...entry.data,
            slots,
          },
        };
      });

      if (!placed) {
        return prev;
      }

      if (displacedItem && displacedItem.id !== draggedItem.id) {
        withPlacement.push(displacedItem);
      }

      return changed ? withPlacement : prev;
    });
  };

  const upsertStickerPlacement = ({ targetId, slotId, stickerId }) => {
    const resolvedSticker = getStickerById(stickerId);
    if (!resolvedSticker || !slotId || !targetId) return;

    if (targetId === "canvas") {
      setCanvasItems((prev) => {
        const filtered = prev.filter(
          (entry) =>
            !(entry.type === "canvasSticker" && String(entry?.data?.slotId || "") === slotId)
        );

        return [
          ...filtered,
          {
            id: `canvas-sticker-${slotId}-${Date.now()}`,
            type: "canvasSticker",
            data: {
              slotId,
              stickerId: resolvedSticker.id,
            },
          },
        ];
      });
      return;
    }

    setCanvasItems((prev) =>
      prev.map((entry) => {
        if (entry.id !== targetId) return entry;
        if (!canItemAcceptStickers(entry.type)) return entry;

        const currentStickers =
          entry?.data?.stickers && typeof entry.data.stickers === "object"
            ? entry.data.stickers
            : {};

        return {
          ...entry,
          data: {
            ...entry.data,
            stickers: {
              ...currentStickers,
              [slotId]: resolvedSticker.id,
            },
          },
        };
      })
    );
  };

  const upsertStickerLayerPlacement = ({ targetId, stickerId, x = 0.5, y = 0.5 }) => {
    const resolvedSticker = getStickerById(stickerId);
    if (!resolvedSticker || !targetId) return;

    setCanvasItems((prev) =>
      prev.map((entry) => {
        if (entry.id !== targetId) return entry;
        if (!canItemAcceptStickers(entry.type)) return entry;
        if (entry.type !== "contribution") return entry;

        const currentLayers = normalizeStickerLayers(entry?.data?.stickerLayers);
        const nextLayer = {
          id: `sticker-layer-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
          stickerId: resolvedSticker.id,
          x: Math.max(0, Math.min(1, Number(x) || 0.5)),
          y: Math.max(0, Math.min(1, Number(y) || 0.5)),
          sizePx: Number(resolvedSticker?.sizePx || 56) * 2,
          rotation: 0,
        };

        return {
          ...entry,
          data: {
            ...entry.data,
            stickerLayers: [...currentLayers, nextLayer],
          },
        };
      })
    );
  };

  const onDragStart = ({ active }) => {
    const source = active?.data?.current?.source;
    if (source !== "sticker-template") {
      setActiveStickerId("");
      return;
    }

    const stickerId = String(active?.data?.current?.stickerId || "").trim();
    setActiveStickerId(stickerId);
  };

  const onDragCancel = () => {
    setActiveStickerId("");
  };

  const onDragEnd = ({ active, over }) => {
    setActiveStickerId("");
    if (!over) return;
    const dragSource = active?.data?.current?.source;

    if (dragSource === "sticker-template") {
      const stickerDropTarget = parseStickerDropId(over.id);
      const stickerSurfaceTarget = parseStickerSurfaceDropId(over.id);
      const stickerId = String(active?.data?.current?.stickerId || "").trim();
      if (stickerDropTarget && stickerId) {
        upsertStickerPlacement({
          targetId: stickerDropTarget.targetId,
          slotId: stickerDropTarget.slotId,
          stickerId,
        });
        return;
      }

      if (stickerSurfaceTarget && stickerId) {
        const translatedRect = active?.rect?.current?.translated;
        const initialRect = active?.rect?.current?.initial;
        const dropRect = over?.rect;

        const centerX =
          Number(translatedRect?.left) + Number(translatedRect?.width) / 2 ||
          Number(initialRect?.left) + Number(initialRect?.width) / 2;
        const centerY =
          Number(translatedRect?.top) + Number(translatedRect?.height) / 2 ||
          Number(initialRect?.top) + Number(initialRect?.height) / 2;

        const normalizedX = Number(dropRect?.width)
          ? (centerX - Number(dropRect?.left || 0)) / Number(dropRect.width)
          : 0.5;
        const normalizedY = Number(dropRect?.height)
          ? (centerY - Number(dropRect?.top || 0)) / Number(dropRect.height)
          : 0.5;

        upsertStickerLayerPlacement({
          targetId: stickerSurfaceTarget.targetId,
          stickerId,
          x: Math.max(0, Math.min(1, normalizedX)),
          y: Math.max(0, Math.min(1, normalizedY)),
        });
      }
      return;
    }

    const sectionDropTarget = parseSectionSlotDropId(over.id);
    if (sectionDropTarget && active?.id) {
      moveCanvasItemToSectionSlot(
        String(active.id),
        sectionDropTarget.sectionId,
        sectionDropTarget.slotIndex
      );
      return;
    }

    if (dragSource === "template") {
      const templateId = active.data.current.templateId;

      const defaults = {
        header: {
          text: "Hi, I'm Your Name",
          subText: "Building delightful products",
          color: "#ffffff",
          subcolor: "#373d35",
          signatureName: "Your Name",
          signatureRole: "Design + Code",
          signatureTheme: "gradient",
          achievementName: "Your Name",
          achievementRole: "Creative Developer",
          achievementAccent: "#ff7a1a",
          achievementList: ["Top 1% GitHub", "Open Source Mentor", "Featured Project"],
          trophyTitle: "Highlights",
          trophyTheme: "midnight",
          trophyColumns: 4,
          trophyList: ["OSS Maintainer", "Top 1% GitHub", "Speaker"],
          customName: "Your Name",
          customSubtitle: "Building thoughtful software",
          customAccents: ["Open Source", "Design Systems"],
          customTheme: "midnight",
        },
        bio: {
          content: bioDefaults.content,
        },
        skills: buildTechStackPayload(techStackDefaults),
        sections: {
          variantId: "equal-2",
          slots: [null, null],
        },
        commits: {
          username: sessionUsername,
          installationId: null,
          statId: "contribution",
        },
        contribution: {
          username: sessionUsername,
          variant: CONTRIBUTION_DEFAULT_VARIANT,
          range: CONTRIBUTION_DEFAULT_RANGE,
        },
        footer: {
          bannerId: defaultFooterBannerId,
        },
      };

      const resolvedType =
        templateId === "commits"
          ? "commitStat"
          : templateId === "sections"
            ? "section"
            : templateId;
      const newItem = {
        id: `canvas-${resolvedType}-${Date.now()}`,
        type: resolvedType,
        data: defaults[templateId] || {},
      };

      if (resolvedType === "contribution") {
        const normalizedRange = normalizeContributionRange(
          newItem?.data?.range || CONTRIBUTION_DEFAULT_RANGE
        );
        newItem.data = {
          ...newItem.data,
          range: normalizedRange,
          assetPath: buildContributionAssetPath(newItem.id, normalizedRange, 0),
        };
      }

      if (resolvedType === "footer") {
        const banner = getFooterBannerById(newItem?.data?.bannerId || defaultFooterBannerId);
        const resolvedBannerId = banner?.id || defaultFooterBannerId;
        newItem.data = {
          ...newItem.data,
          bannerId: resolvedBannerId,
          assetPath: buildFooterAssetPath(newItem.id, resolvedBannerId),
        };
      }

      if (over.id === "canvas") {
        setCanvasItems((prev) => [...prev, newItem]);
        return;
      }

      const index = canvasItems.findIndex((i) => i.id === over.id);
      if (index !== -1) {
        setCanvasItems((prev) => {
          const copy = [...prev];
          copy.splice(index, 0, newItem);
          return copy;
        });
      }
      return;
    }

    if (active.id?.startsWith("canvas-")) {
      const oldIndex = canvasItems.findIndex((i) => i.id === active.id);
      const newIndex = canvasItems.findIndex((i) => i.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setCanvasItems((prev) => arrayMove(prev, oldIndex, newIndex));
      }
    }
  };

  const addHeaderToCanvas = (variant, overrides = {}) => {
    const defaults = {
      color: "#ffffff",
      subcolor: "#373d35",
      text: "",
      subText: "",
      bannerUrl: "/headers/DragonBannerHeader.png",
      signatureName: "Your Name",
      signatureRole: "Design + Code",
      signatureTheme: "gradient",
      achievementName: "Your Name",
      achievementRole: "Creative Developer",
      achievementAccent: "#ff7a1a",
      achievementList: ["Top 1% GitHub", "Open Source Mentor", "Featured Project"],
      trophyTitle: "Highlights",
      trophyTheme: "midnight",
      trophyColumns: 4,
      trophyList: ["OSS Maintainer", "Top 1% GitHub", "Speaker"],
      customName: "Your Name",
      customSubtitle: "Building thoughtful software",
      customAccents: ["Open Source", "Design Systems"],
      customTheme: "midnight",
    };

    const newItem = {
      id: `canvas-header-${Date.now()}`,
      type: "header",
      variant,
      data: { ...defaults, ...overrides },
    };

    setCanvasItems((prev) => [...prev, newItem]);
  };

  const addBioToCanvas = (overrides = {}) => {
    const newItem = {
      id: `canvas-bio-${Date.now()}`,
      type: "bio",
      data: {
        ...bioDefaults,
        ...overrides,
      },
    };

    setCanvasItems((prev) => [...prev, newItem]);
  };

  const addTechStackToCanvas = (overrides = {}) => {
    const newItem = {
      id: `canvas-skills-${Date.now()}`,
      type: "skills",
      data: buildTechStackPayload({
        ...techStackDefaults,
        ...overrides,
      }),
    };

    setCanvasItems((prev) => [...prev, newItem]);
  };

  const addSectionToCanvas = ({ variantId } = {}) => {
    const variant = getSectionVariantById(variantId);
    const newItem = {
      id: `canvas-section-${Date.now()}`,
      type: "section",
      data: {
        variantId: variant.id,
        slots: Array.from({ length: Number(variant.slotCount || 0) }, () => null),
      },
    };

    setCanvasItems((prev) => [...prev, newItem]);
  };

  const addCommitStatsItemsToCanvas = async ({
    itemIds = [],
  } = {}) => {
    const username = sessionUsername;
    const selectedIds = (Array.isArray(itemIds) ? itemIds : [])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);
    const normalizedItemIds = selectedIds.length
      ? selectedIds
      : REPO_COMMIT_STAT_ITEMS.map((item) => item.id);

    const snapshot = await bootstrapCommitStatsSnapshot(username, null);
    const installationId =
      Number(snapshot?.installation_id || 0) || null;
    const now = Date.now();

    const newItems = normalizedItemIds.map((statId, index) => ({
      id: `canvas-commit-stat-${statId}-${now + index}`,
      type: "commitStat",
      data: {
        username,
        installationId,
        statId,
        ...(snapshot ? { statsSnapshot: snapshot } : {}),
      },
    }));

    setCanvasItems((prev) => [...prev, ...newItems]);
  };

  const addContributionGraphToCanvas = async ({
    variant = CONTRIBUTION_DEFAULT_VARIANT,
    range = CONTRIBUTION_DEFAULT_RANGE,
  } = {}) => {
    const username = sessionUsername;
    const normalizedVariant = normalizeContributionVariant(variant);
    const normalizedRange = normalizeContributionRange(range);
    const snapshot = await bootstrapContributionSnapshot(username);
    const newItemId = `canvas-contribution-${Date.now()}`;

    const newItem = {
      id: newItemId,
      type: "contribution",
      data: {
        username,
        variant: normalizedVariant,
        range: normalizedRange,
        assetPath: buildContributionAssetPath(newItemId, normalizedRange, 0),
        ...(snapshot ? { contributionSnapshot: snapshot } : {}),
      },
    };

    setCanvasItems((prev) => [...prev, newItem]);
  };

  const addFooterToCanvas = ({
    bannerId = defaultFooterBannerId,
  } = {}) => {
    const banner = getFooterBannerById(bannerId || defaultFooterBannerId);
    const resolvedBannerId = banner?.id || defaultFooterBannerId;
    const newItemId = `canvas-footer-${Date.now()}`;

    const newItem = {
      id: newItemId,
      type: "footer",
      data: {
        bannerId: resolvedBannerId,
        assetPath: buildFooterAssetPath(newItemId, resolvedBannerId),
      },
    };

    setCanvasItems((prev) => [...prev, newItem]);
  };

  const updateCanvasItemById = (itemId, updater) => {
    const normalizedItemId = String(itemId || "").trim();
    if (!normalizedItemId || typeof updater !== "function") return;

    setCanvasItems((prev) => {
      let changed = false;

      const nextItems = prev.map((entry) => {
        if (entry.id === normalizedItemId) {
          changed = true;
          return updater(entry);
        }

        if (entry.type !== "section") {
          return entry;
        }

        const slots = Array.isArray(entry?.data?.slots) ? entry.data.slots : [];
        let slotChanged = false;
        const nextSlots = slots.map((slotItem) => {
          if (!slotItem || slotItem.id !== normalizedItemId) {
            return slotItem;
          }

          slotChanged = true;
          changed = true;
          return updater(slotItem);
        });

        if (!slotChanged) {
          return entry;
        }

        return {
          ...entry,
          data: {
            ...entry.data,
            slots: nextSlots,
          },
        };
      });

      return changed ? nextItems : prev;
    });
  };

  const openHeaderPickerForAdd = () => {
    setShowBioPicker(false);
    setShowTechStackPicker(false);
    setShowRepoCommitPicker(false);
    setShowSectionPicker(false);
    setShowContributionPicker(false);
    setShowStickerPicker(false);
    setShowFooterPicker(false);
    setHeaderPickerContext({
      itemId: null,
      initialVariant: null,
      initialData: null,
      pickerKey: Date.now(),
    });
    setShowHeaderPicker(true);
  };

  const openHeaderPickerForEdit = (item) => {
    if (item.type !== "header") return;

    setShowBioPicker(false);
    setShowTechStackPicker(false);
    setShowRepoCommitPicker(false);
    setShowSectionPicker(false);
    setShowContributionPicker(false);
    setShowStickerPicker(false);
    setShowFooterPicker(false);
    setHeaderPickerContext({
      itemId: item.id,
      initialVariant: item.variant || null,
      initialData: item.data || null,
      pickerKey: Date.now(),
    });
    setShowHeaderPicker(true);
  };

  const closeHeaderPicker = () => {
    setShowHeaderPicker(false);
  };

  const openBioPickerForAdd = () => {
    setShowHeaderPicker(false);
    setShowTechStackPicker(false);
    setShowRepoCommitPicker(false);
    setShowSectionPicker(false);
    setShowContributionPicker(false);
    setShowStickerPicker(false);
    setShowFooterPicker(false);
    setBioPickerContext({
      itemId: null,
      initialData: null,
      pickerKey: Date.now(),
    });
    setShowBioPicker(true);
  };

  const openBioPickerForEdit = (item) => {
    if (item.type !== "bio") return;

    setShowHeaderPicker(false);
    setShowTechStackPicker(false);
    setShowRepoCommitPicker(false);
    setShowSectionPicker(false);
    setShowContributionPicker(false);
    setShowStickerPicker(false);
    setShowFooterPicker(false);
    setBioPickerContext({
      itemId: item.id,
      initialData: item.data || null,
      pickerKey: Date.now(),
    });
    setShowBioPicker(true);
  };

  const closeBioPicker = () => {
    setShowBioPicker(false);
  };

  const openTechStackPickerForAdd = () => {
    setShowHeaderPicker(false);
    setShowBioPicker(false);
    setShowRepoCommitPicker(false);
    setShowSectionPicker(false);
    setShowContributionPicker(false);
    setShowStickerPicker(false);
    setShowFooterPicker(false);
    setTechStackPickerContext({
      itemId: null,
      initialData: null,
      pickerKey: Date.now(),
    });
    setShowTechStackPicker(true);
  };

  const openTechStackPickerForEdit = (item) => {
    if (item.type !== "skills") return;

    setShowHeaderPicker(false);
    setShowBioPicker(false);
    setShowRepoCommitPicker(false);
    setShowSectionPicker(false);
    setShowContributionPicker(false);
    setShowStickerPicker(false);
    setShowFooterPicker(false);
    setTechStackPickerContext({
      itemId: item.id,
      initialData: item.data || null,
      pickerKey: Date.now(),
    });
    setShowTechStackPicker(true);
  };

  const closeTechStackPicker = () => {
    setShowTechStackPicker(false);
  };

  const openSectionPickerForAdd = () => {
    setShowHeaderPicker(false);
    setShowBioPicker(false);
    setShowTechStackPicker(false);
    setShowRepoCommitPicker(false);
    setShowContributionPicker(false);
    setShowStickerPicker(false);
    setShowFooterPicker(false);
    setSectionPickerContext({
      itemId: null,
      initialVariantId: null,
      pickerKey: Date.now(),
    });
    setShowSectionPicker(true);
  };

  const openSectionPickerForEdit = (item) => {
    if (item.type !== "section") return;

    setShowHeaderPicker(false);
    setShowBioPicker(false);
    setShowTechStackPicker(false);
    setShowRepoCommitPicker(false);
    setShowContributionPicker(false);
    setShowStickerPicker(false);
    setShowFooterPicker(false);
    setSectionPickerContext({
      itemId: item.id,
      initialVariantId: item?.data?.variantId || null,
      pickerKey: Date.now(),
    });
    setShowSectionPicker(true);
  };

  const closeSectionPicker = () => {
    setShowSectionPicker(false);
  };

  const openRepoCommitPickerForAdd = () => {
    setShowHeaderPicker(false);
    setShowBioPicker(false);
    setShowTechStackPicker(false);
    setShowSectionPicker(false);
    setShowContributionPicker(false);
    setShowStickerPicker(false);
    setShowFooterPicker(false);
    setRepoCommitPickerContext({
      itemId: null,
      initialItemIds: [],
      pickerKey: Date.now(),
    });
    setShowRepoCommitPicker(true);
  };

  const openRepoCommitPickerForEdit = (item) => {
    if (item.type !== "commitStat") return;

    setShowHeaderPicker(false);
    setShowBioPicker(false);
    setShowTechStackPicker(false);
    setShowSectionPicker(false);
    setShowContributionPicker(false);
    setShowStickerPicker(false);
    setShowFooterPicker(false);
    setRepoCommitPickerContext({
      itemId: item.id,
      initialItemIds: [String(item?.data?.statId || "contribution")],
      pickerKey: Date.now(),
    });
    setShowRepoCommitPicker(true);
  };

  const closeRepoCommitPicker = () => {
    setShowRepoCommitPicker(false);
  };

  const openContributionPickerForAdd = () => {
    setShowHeaderPicker(false);
    setShowBioPicker(false);
    setShowTechStackPicker(false);
    setShowSectionPicker(false);
    setShowRepoCommitPicker(false);
    setShowStickerPicker(false);
    setShowFooterPicker(false);
    setContributionPickerContext({
      itemId: null,
      initialData: null,
      pickerKey: Date.now(),
    });
    setShowContributionPicker(true);
  };

  const openContributionPickerForEdit = (item) => {
    if (item.type !== "contribution") return;

    setShowHeaderPicker(false);
    setShowBioPicker(false);
    setShowTechStackPicker(false);
    setShowSectionPicker(false);
    setShowRepoCommitPicker(false);
    setShowStickerPicker(false);
    setShowFooterPicker(false);
    setContributionPickerContext({
      itemId: item.id,
      initialData: item.data || null,
      pickerKey: Date.now(),
    });
    setShowContributionPicker(true);
  };

  const closeContributionPicker = () => {
    setShowContributionPicker(false);
  };

  const openFooterPickerForAdd = () => {
    setShowHeaderPicker(false);
    setShowBioPicker(false);
    setShowTechStackPicker(false);
    setShowSectionPicker(false);
    setShowRepoCommitPicker(false);
    setShowContributionPicker(false);
    setShowStickerPicker(false);
    setShowFooterPicker(false);
    setFooterPickerContext({
      itemId: null,
      initialData: null,
      pickerKey: Date.now(),
    });
    setShowFooterPicker(true);
  };

  const openFooterPickerForEdit = (item) => {
    if (item.type !== "footer") return;

    setShowHeaderPicker(false);
    setShowBioPicker(false);
    setShowTechStackPicker(false);
    setShowSectionPicker(false);
    setShowRepoCommitPicker(false);
    setShowContributionPicker(false);
    setShowStickerPicker(false);
    setShowFooterPicker(false);
    setFooterPickerContext({
      itemId: item.id,
      initialData: item.data || null,
      pickerKey: Date.now(),
    });
    setShowFooterPicker(true);
  };

  const closeFooterPicker = () => {
    setShowFooterPicker(false);
  };

  const openStickerPicker = () => {
    setShowHeaderPicker(false);
    setShowBioPicker(false);
    setShowTechStackPicker(false);
    setShowSectionPicker(false);
    setShowRepoCommitPicker(false);
    setShowContributionPicker(false);
    setShowFooterPicker(false);
    setShowStickerPicker(true);
  };

  const closeStickerPicker = () => {
    setShowStickerPicker(false);
  };

  const handleHeaderSelect = (variant, data) => {
    if (headerPickerContext.itemId) {
      updateCanvasItemById(headerPickerContext.itemId, (item) => ({
        ...item,
        variant,
        data: { ...item.data, ...data },
      }));
    } else {
      addHeaderToCanvas(variant, data);
    }

    closeHeaderPicker();
  };

  const handleBioSelect = (data) => {
    if (bioPickerContext.itemId) {
      updateCanvasItemById(bioPickerContext.itemId, (item) => ({
        ...item,
        data: {
          ...bioDefaults,
          ...item.data,
          ...data,
        },
      }));
    } else {
      addBioToCanvas(data);
    }

    closeBioPicker();
  };

  const handleTechStackSelect = (data) => {
    const payload = buildTechStackPayload(data);

    if (techStackPickerContext.itemId) {
      updateCanvasItemById(techStackPickerContext.itemId, (item) => ({
        ...item,
        data: {
          ...techStackDefaults,
          ...item.data,
          ...payload,
        },
      }));
    } else {
      addTechStackToCanvas(payload);
    }

    closeTechStackPicker();
  };

  const handleSectionSelection = async ({ variantId }) => {
    const nextVariantId = String(variantId || "").trim();
    const selectedVariant = getSectionVariantById(nextVariantId);
    if (!selectedVariant?.id) return;

    if (sectionPickerContext.itemId) {
      updateCanvasItemById(sectionPickerContext.itemId, (item) => {
        const currentSlots = Array.isArray(item?.data?.slots)
          ? item.data.slots.slice(0, selectedVariant.slotCount)
          : [];
        const nextSlots =
          currentSlots.length >= selectedVariant.slotCount
            ? currentSlots
            : [
                ...currentSlots,
                ...Array.from(
                  { length: selectedVariant.slotCount - currentSlots.length },
                  () => null
                ),
              ];

        return {
          ...item,
          data: {
            ...item.data,
            variantId: selectedVariant.id,
            slots: nextSlots,
          },
        };
      });
    } else {
      addSectionToCanvas({
        variantId: selectedVariant.id,
      });
    }

    closeSectionPicker();
  };

  const handleRepoCommitSelection = async ({ itemIds }) => {
    const normalizedItemIds = (Array.isArray(itemIds) ? itemIds : [])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);

    if (repoCommitPickerContext.itemId) {
      const nextStatId = normalizedItemIds[0] || REPO_COMMIT_STAT_ITEMS[0]?.id || "contribution";
      updateCanvasItemById(repoCommitPickerContext.itemId, (item) => ({
        ...item,
        data: {
          ...item.data,
          username: resolveCanvasUsername(item?.data?.username),
          statId: nextStatId,
        },
      }));
      closeRepoCommitPicker();
      return;
    }

    await addCommitStatsItemsToCanvas({
      itemIds: normalizedItemIds,
    });
    closeRepoCommitPicker();
  };

  const handleContributionSelection = async ({ variant, range }) => {
    const normalizedVariant = normalizeContributionVariant(variant);
    const normalizedRange = normalizeContributionRange(range);

    if (contributionPickerContext.itemId) {
      updateCanvasItemById(contributionPickerContext.itemId, (entry) => ({
        ...entry,
        data: {
          ...entry.data,
          username: resolveCanvasUsername(entry?.data?.username),
          variant: normalizedVariant,
          range: normalizedRange,
          assetPath: buildContributionAssetPath(entry.id, normalizedRange, 0),
        },
      }));
    } else {
      await addContributionGraphToCanvas({
        variant: normalizedVariant,
        range: normalizedRange,
      });
    }

    closeContributionPicker();
  };

  const handleFooterSelection = async ({ bannerId }) => {
    const banner = getFooterBannerById(bannerId || defaultFooterBannerId);
    const resolvedBannerId = banner?.id || defaultFooterBannerId;

    if (footerPickerContext.itemId) {
      updateCanvasItemById(footerPickerContext.itemId, (entry) => ({
        ...entry,
        data: {
          ...entry.data,
          bannerId: resolvedBannerId,
          assetPath: buildFooterAssetPath(entry.id, resolvedBannerId),
        },
      }));
    } else {
      addFooterToCanvas({ bannerId: resolvedBannerId });
    }

    closeFooterPicker();
  };

  const handleEditItem = (item) => {
    if (item.type === "header") {
      openHeaderPickerForEdit(item);
      return;
    }

    if (item.type === "bio") {
      openBioPickerForEdit(item);
      return;
    }

    if (item.type === "skills") {
      openTechStackPickerForEdit(item);
      return;
    }

    if (item.type === "section") {
      openSectionPickerForEdit(item);
      return;
    }

    if (item.type === "commitStat") {
      openRepoCommitPickerForEdit(item);
      return;
    }

    if (item.type === "contribution") {
      openContributionPickerForEdit(item);
      return;
    }

    if (item.type === "footer") {
      openFooterPickerForEdit(item);
    }
  };

  const handleSelectSidebarBlock = (blockId) => {
    if (blockId === "header") {
      openHeaderPickerForAdd();
    } else if (blockId === "bio") {
      openBioPickerForAdd();
    } else if (blockId === "skills") {
      openTechStackPickerForAdd();
    } else if (blockId === "stickers") {
      openStickerPicker();
    } else if (blockId === "sections") {
      openSectionPickerForAdd();
    } else if (blockId === "commits") {
      openRepoCommitPickerForAdd();
    } else if (blockId === "contribution") {
      openContributionPickerForAdd();
    } else if (blockId === "footer") {
      openFooterPickerForAdd();
    } else {
      setActiveBlock(blockId);
    }

    setShowMobileLibrary(false);
  };

  const activeSticker = getStickerById(activeStickerId);

  return (
    <div className="relative min-h-screen bg-[#0b0d0f] text-white">
      <div className="pointer-events-none absolute -left-40 top-8 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.24),_transparent_60%)] blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(48,214,255,0.18),_transparent_60%)] blur-3xl" />

      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0d1117]/95 p-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMobileLibrary((prev) => !prev)}
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white/85 transition hover:bg-white/10"
          >
            {showMobileLibrary ? "Hide Blocks" : "Show Blocks"}
          </button>
          <button
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition cursor-pointer ${
              isAuthenticated
                ? "bg-[#ff7a1a] text-black hover:bg-[#ff8c3a]"
                : "border border-white/20 bg-white/5 text-white/75 hover:bg-white/10"
            }`}
            aria-disabled={!isAuthenticated}
            title={isAuthenticated ? "Update README" : "Sign in required to update README"}
            onClick={updateProfileReadme}
          >
            {isAuthenticated ? "Update README" : "Sign in to Update README"}
          </button>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-64px)] flex-col lg:h-screen lg:min-h-screen lg:flex-row">
        <div className={`${showMobileLibrary ? "block" : "hidden"} border-b border-white/10 lg:block lg:border-b-0 lg:border-r`}>
          <div className="z-10 flex flex-col bg-[#0d1117] lg:h-screen">
            <Sidebar onSelectBlock={handleSelectSidebarBlock} />
            <div className="hidden border-t border-white/10 p-4 lg:block">
              <button
                className={`w-full rounded-full px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                  isAuthenticated
                    ? "bg-[#ff7a1a] text-black hover:bg-[#ff8c3a]"
                    : "border border-white/20 bg-white/5 text-white/75 hover:bg-white/10"
                }`}
                aria-disabled={!isAuthenticated}
                title={isAuthenticated ? "Update README" : "Sign in required to update README"}
                onClick={updateProfileReadme}
              >
                {isAuthenticated ? "Update README" : "Sign in to Update README"}
              </button>
            </div>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={onDragStart}
          onDragCancel={onDragCancel}
          onDragEnd={onDragEnd}
        >
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
            <div className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ffb37f]">
                    Profile Builder
                  </p>
                  <h2 className="mt-2 text-xl font-semibold sm:text-2xl">Profile README Builder</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68">
                    Manual README publishing stays free. Githance Pro unlocks GitHub Actions based auto-update for contribution graph assets and recurring README refresh workflows.
                  </p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#0d1117] p-4 xl:max-w-md">
                  <div className="flex items-start gap-3">
                    <label className="mt-1 inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={autoUpdateEnabled && isPro}
                        onChange={(event) => setAutoUpdateEnabled(event.target.checked)}
                        disabled={!isPro || billingLoading}
                        className="h-4 w-4 rounded border border-white/20 bg-black/20 accent-[#ff7a1a]"
                      />
                    </label>
                    <div>
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                        <LockIcon className="h-4 w-4 text-[#ffd6b7]" />
                        Auto-update README assets
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/62">
                        Publish the contribution graph workflow, generator script, and config so GitHub Actions can keep your README visuals fresh.
                      </p>
                      {!isPro ? (
                        <div className="mt-3 flex flex-wrap gap-3">
                          <Link
                            href="/pricing#pro"
                            className="rounded-full border border-[#ff7a1a]/35 bg-[#ff7a1a]/15 px-4 py-2 text-sm font-semibold text-[#ffd6b7] transition hover:bg-[#ff7a1a]/25"
                          >
                            Upgrade for auto-update
                          </Link>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/50">
                            Manual publish stays free
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {publishFeedback.message ? (
                <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                  publishFeedback.tone === "success"
                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                    : publishFeedback.tone === "error"
                      ? "border-red-500/25 bg-red-500/10 text-red-100"
                      : "border-amber-400/25 bg-amber-500/10 text-amber-100"
                }`}>
                  {publishFeedback.message}
                </div>
              ) : null}
            </div>

            <Canvas
              readmeData={readme}
              items={canvasItems}
              setItems={setCanvasItems}
              onEditItem={handleEditItem}
            />
          </div>

          <DragOverlay dropAnimation={null}>
            {activeSticker ? (
              <div className="pointer-events-none rounded-2xl border border-cyan-300/55 bg-[#0d1117]/90 p-2 shadow-[0_16px_36px_rgba(0,0,0,0.45)]">
                <SafeImage
                  src={activeSticker.assetPath}
                  alt={activeSticker.title}
                  width={160}
                  height={160}
                  className={`${activeSticker.sizeClass} object-contain`}
                  sizes="160px"
                />
              </div>
            ) : null}
          </DragOverlay>

          <HeaderVariantPicker
            key={`header-${headerPickerContext.pickerKey}`}
            open={showHeaderPicker}
            onClose={closeHeaderPicker}
            onSelectVariant={handleHeaderSelect}
            initialVariant={headerPickerContext.initialVariant}
            initialData={headerPickerContext.initialData}
            submitLabel={headerPickerContext.itemId ? "Update Item" : "Add to Canvas"}
          />

          <BioVariantPicker
            key={`bio-${bioPickerContext.pickerKey}`}
            open={showBioPicker}
            onClose={closeBioPicker}
            onSave={handleBioSelect}
            initialData={bioPickerContext.initialData}
            submitLabel={bioPickerContext.itemId ? "Update Item" : "Add to Canvas"}
          />

          <TechStackVariantPicker
            key={`skills-${techStackPickerContext.pickerKey}`}
            open={showTechStackPicker}
            onClose={closeTechStackPicker}
            onSave={handleTechStackSelect}
            initialData={techStackPickerContext.initialData}
            submitLabel={techStackPickerContext.itemId ? "Update Item" : "Add to Canvas"}
          />

          <SectionVariantPicker
            key={`sections-${sectionPickerContext.pickerKey}`}
            open={showSectionPicker}
            onClose={closeSectionPicker}
            onSave={handleSectionSelection}
            initialVariantId={sectionPickerContext.initialVariantId}
            submitLabel={sectionPickerContext.itemId ? "Update Section" : "Add Section"}
          />

          <RepoCommitVariantPicker
            key={`commits-${repoCommitPickerContext.pickerKey}`}
            open={showRepoCommitPicker}
            onClose={closeRepoCommitPicker}
            onSave={handleRepoCommitSelection}
            initialItemIds={repoCommitPickerContext.initialItemIds}
            selectionMode={repoCommitPickerContext.itemId ? "single" : "multiple"}
            submitLabel={repoCommitPickerContext.itemId ? "Update Item" : "Add Selected"}
          />

          <ContributionGraphVariantPicker
            key={`contribution-${contributionPickerContext.pickerKey}`}
            open={showContributionPicker}
            onClose={closeContributionPicker}
            onSave={handleContributionSelection}
            initialData={contributionPickerContext.initialData}
            submitLabel={contributionPickerContext.itemId ? "Update Item" : "Add to Canvas"}
          />

          <FooterVariantPicker
            key={`footer-${footerPickerContext.pickerKey}`}
            open={showFooterPicker}
            onClose={closeFooterPicker}
            onSave={handleFooterSelection}
            initialData={footerPickerContext.initialData}
            submitLabel={footerPickerContext.itemId ? "Update Item" : "Add to Canvas"}
          />

          <StickerPicker
            open={showStickerPicker}
            onClose={closeStickerPicker}
          />
        </DndContext>
      </div>
    </div>
  );
}







