"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import generateMarkdown from "../lib/genrateMarkdown";
import HeaderVariantPicker from "../components/pickers/HeaderVariantPicker";
import BioVariantPicker from "../components/pickers/BioVariantPicker";
import TechStackVariantPicker from "../components/pickers/TechStackVariantPicker";
import RepoCommitVariantPicker from "../components/pickers/RepoCommitVariantPicker";
import SectionVariantPicker from "../components/pickers/SectionVariantPicker";
import {
  DndContext,
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
import {
  getSectionVariantById,
  parseSectionSlotDropId,
} from "../lib/sectionCatalog";

const collisionDetectionStrategy = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length) {
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
  const [sectionPickerKey, setSectionPickerKey] = useState(0);
  const [showRepoCommitPicker, setShowRepoCommitPicker] = useState(false);
  const [repoCommitPickerKey, setRepoCommitPickerKey] = useState(0);
  const token = session?.accessToken;
  const [markdown, setMarkdown] = useState([]);

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
          force: true,
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

  const enrichCommitBlocks = async (items) => {
    const commitBlocks = items.filter(
      (item) => item.type === "commitStat" || item.type === "commits"
    );
    if (!commitBlocks.length) return items;

    const statsByIdentity = new Map();

    await Promise.all(
      commitBlocks.map(async (item) => {
        const username = String(item?.data?.username || session?.username || "").trim();
        const installationId = Number(item?.data?.installationId || 0) || null;
        const identityKey = `${username}:${installationId ?? "auto"}`;
        if (!username || statsByIdentity.has(identityKey)) return;

        const snapshot = await bootstrapCommitStatsSnapshot(username, installationId);
        if (snapshot) {
          statsByIdentity.set(identityKey, snapshot);
        }
      })
    );

    return items.map((item) => {
      if (item.type !== "commitStat" && item.type !== "commits") return item;

      const username = String(item?.data?.username || session?.username || "").trim();
      const installationId = Number(item?.data?.installationId || 0) || null;
      const identityKey = `${username}:${installationId ?? "auto"}`;
      const snapshot = statsByIdentity.get(identityKey);
      if (!snapshot) return item;

      return {
        ...item,
        data: {
          ...item.data,
          username,
          statsSnapshot: snapshot,
          installationId: Number(snapshot?.installation_id || item?.data?.installationId || 0) || null,
        },
      };
    });
  };

  const updateProfileReadme = async () => {
    if (status !== "authenticated" || !session?.username || !token) {
      console.error("Missing authenticated session for README update.");
      return;
    }

    const enrichedItems = await enrichCommitBlocks(canvasItems);
    setCanvasItems(enrichedItems);

    const latestMarkdown = generateMarkdown(enrichedItems);
    setMarkdown(latestMarkdown);

    const res = await fetch("/api/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: session.username,
        repo: session.username,
        path: "README.md",
        message: "Updated via Analyzer App",
        content: latestMarkdown,
        token: token,
      }),
    });

    const data = await res.json();
    console.log("Update result:", data);
    console.log(latestMarkdown);
  };

  useEffect(() => {
    setMarkdown(generateMarkdown(canvasItems));
  }, [canvasItems]);

  useEffect(() => {
    if (!session?.username) return;

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
  }, [session?.username]);

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

  const onDragEnd = ({ active, over }) => {
    if (!over) return;

    const sectionDropTarget = parseSectionSlotDropId(over.id);
    if (sectionDropTarget && active?.id) {
      moveCanvasItemToSectionSlot(
        String(active.id),
        sectionDropTarget.sectionId,
        sectionDropTarget.slotIndex
      );
      return;
    }

    if (active.data?.current?.source === "template") {
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
          username: session?.username || "your-github-username",
          installationId: null,
          statId: "contribution",
          theme: "neon",
        },
        contributions: { username: "your-github-username" },
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
    theme = "neon",
    itemIds = [],
  } = {}) => {
    const username = String(session?.username || "your-github-username").trim();
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
        theme: String(theme || "neon").trim().toLowerCase() || "neon",
        ...(snapshot ? { statsSnapshot: snapshot } : {}),
      },
    }));
    const commitSectionVariant = getSectionVariantById("grid-3x2");
    const slottedItems = Array.from(
      { length: Number(commitSectionVariant.slotCount || 0) },
      (_, index) => newItems[index] || null
    );
    const sectionItem = {
      id: `canvas-section-commit-stats-${now}`,
      type: "section",
      data: {
        variantId: commitSectionVariant.id,
        showBorders: true,
        slots: slottedItems,
      },
    };

    setCanvasItems((prev) => [...prev, sectionItem]);
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
    setSectionPickerKey(Date.now());
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
    setRepoCommitPickerKey(Date.now());
    setShowRepoCommitPicker(true);
  };

  const closeRepoCommitPicker = () => {
    setShowRepoCommitPicker(false);
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
    addSectionToCanvas({
      variantId,
    });
    closeSectionPicker();
  };

  const handleRepoCommitSelection = async ({ theme, itemIds }) => {
    await addCommitStatsItemsToCanvas({
      theme,
      itemIds,
    });
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
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0b0d0f] text-white">
      <div className="pointer-events-none absolute -left-40 top-8 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.24),_transparent_60%)] blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(48,214,255,0.18),_transparent_60%)] blur-3xl" />

      <div className="flex h-screen">
        <div className="z-10 flex flex-col">
          <Sidebar
            onSelectBlock={(blockId) => {
              if (blockId === "header") {
                openHeaderPickerForAdd();
                return;
              }

              if (blockId === "bio") {
                openBioPickerForAdd();
                return;
              }

              if (blockId === "skills") {
                openTechStackPickerForAdd();
                return;
              }

              if (blockId === "sections") {
                openSectionPickerForAdd();
                return;
              }

              if (blockId === "commits") {
                openRepoCommitPickerForAdd();
                return;
              }

              setActiveBlock(blockId);
            }}
          />
          <div className="border-r border-white/10 bg-[#0d1117] p-4">
            <button
              className="w-full rounded-full bg-[#ff7a1a] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#ff8c3a] cursor-pointer"
              onClick={updateProfileReadme}
            >
              Update README
            </button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragEnd={onDragEnd}
        >
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-5 rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Builder</p>
              <h2 className="mt-2 text-2xl font-semibold">Profile README Builder</h2>
              <p className="mt-2 text-sm text-white/60">
                Compose sections, preview blocks, and publish to your profile with consistent visual style.
              </p>
            </div>

            <Canvas
              readmeData={readme}
              items={canvasItems}
              setItems={setCanvasItems}
              onEditItem={handleEditItem}
            />
          </div>

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
            key={`sections-${sectionPickerKey}`}
            open={showSectionPicker}
            onClose={closeSectionPicker}
            onSave={handleSectionSelection}
            submitLabel="Add Section"
          />

          <RepoCommitVariantPicker
            key={`commits-${repoCommitPickerKey}`}
            open={showRepoCommitPicker}
            onClose={closeRepoCommitPicker}
            onSave={handleRepoCommitSelection}
            submitLabel="Add Selected"
          />
        </DndContext>
      </div>
    </div>
  );
}
