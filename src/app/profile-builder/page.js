"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import generateMarkdown from "../lib/genrateMarkdown";
import HeaderVariantPicker from "../components/pickers/HeaderVariantPicker";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import Sidebar from "../components/sidebar/Sidebar";
import Canvas from "../components/canvas/Canvas";

export default function Page() {
  const { data: session, status } = useSession();

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
  const token = session?.accessToken;
  const [markdown, setMarkdown] = useState([]);

  const updateProfileReadme = async () => {
    if (status !== "authenticated" || !session?.username || !token) {
      console.error("Missing authenticated session for README update.");
      return;
    }

    const latestMarkdown = generateMarkdown(canvasItems);
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
      activationConstraint: { distance: 10 },
    }),
    useSensor(KeyboardSensor)
  );

  const handlePreview = () => {
    setMarkdownPreview(generateMarkdown(canvasItems));
  };

  const onDragEnd = ({ active, over }) => {
    if (!over) return;

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
          variant: "badge",
          theme: "midnight",
          title: "Full Stack Developer",
          summary: "I build modern web apps, experiment with AI tooling, and care about great DX.",
          focus: ["Next.js", "AI tooling", "Design systems"],
        },
        skills: {
          variant: "grid",
          theme: "midnight",
          stack: ["Next.js", "React", "Node.js", "Tailwind CSS"],
        },
        contributions: { username: "your-github-username" },
      };

      const newItem = {
        id: `canvas-${templateId}-${Date.now()}`,
        type: templateId,
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

  const openHeaderPickerForAdd = () => {
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

  const handleHeaderSelect = (variant, data) => {
    if (headerPickerContext.itemId) {
      setCanvasItems((prev) =>
        prev.map((item) =>
          item.id === headerPickerContext.itemId
            ? { ...item, variant, data: { ...item.data, ...data } }
            : item
        )
      );
    } else {
      addHeaderToCanvas(variant, data);
    }

    closeHeaderPicker();
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
          collisionDetection={closestCorners}
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
              onEditItem={openHeaderPickerForEdit}
            />
          </div>

          <HeaderVariantPicker
            key={headerPickerContext.pickerKey}
            open={showHeaderPicker}
            onClose={closeHeaderPicker}
            onSelectVariant={handleHeaderSelect}
            initialVariant={headerPickerContext.initialVariant}
            initialData={headerPickerContext.initialData}
            submitLabel={headerPickerContext.itemId ? "Update Item" : "Add to Canvas"}
          />
        </DndContext>
      </div>
    </div>
  );
}
