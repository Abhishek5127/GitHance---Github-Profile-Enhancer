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
  const { data: session } = useSession();

  const [canvasItems, setCanvasItems] = useState([]);
  const [readme, setReadme] = useState("");
  const [markdownPreview, setMarkdownPreview] = useState("");
  const [activeBlock, setActiveBlock] = useState(null);
  const [showHeaderPicker, setShowHeaderPicker] = useState(false);
  const token = session?.accessToken;
  const [markdown, setMarkdown] = useState([]);

  const updateProfileReadme = async () => {
    const res = await fetch("/api/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "abhishek5127",
        repo: "abhishek5127",
        path: "README.md",
        message: "Updated via Analyzer App",
        content: markdown,
        token: token,
      }),
    });

    const data = await res.json();
    console.log("Update result:", data);
    console.log(markdown);
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

  const addHeaderToCanvas = (variant) => {
    const newItem = {
      id: `canvas-header-${Date.now()}`,
      type: "header",
      variant,
      data: {
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
      },
    };

    setCanvasItems((prev) => [...prev, newItem]);
  };

  return (
    <div className="flex h-screen bg-[#0b0d0f] text-white">
      <div>
        <Sidebar
          onSelectBlock={(blockId) => {
            if (blockId === "header") {
              setShowHeaderPicker(true);
            }
            setActiveBlock(blockId);
          }}
        />
        <button
          className="bg-green-700 w-20 border-2 rounded-2xl p-2 mt-5 ml-10 cursor-pointer hover:bg-green-900"
          onClick={updateProfileReadme}
        >
          Update
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={onDragEnd}
      >
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-2xl mb-4">Profile README Builder</h2>

          <Canvas readmeData={readme} items={canvasItems} setItems={setCanvasItems} />
        </div>

        <HeaderVariantPicker
          open={showHeaderPicker}
          onClose={() => setShowHeaderPicker(false)}
          onSelectVariant={(variant) => {
            addHeaderToCanvas(variant);
            setShowHeaderPicker(false);
          }}
        />
      </DndContext>
    </div>
  );
}