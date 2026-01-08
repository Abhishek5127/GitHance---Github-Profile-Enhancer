"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import generateMarkdown from "../lib/genrateMarkdown";
import MarkdownPreview from "../components/markdownPreview";
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

    const updateProfileReadme = async () => {
        const res = await fetch("/api/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: 'abhishek5127',
                repo: 'abhishek5127',
                path: "README.md",
                message: "Updated via Analyzer App",
                content: "Test 2 ",
                token: token
            }),
        });

        const data = await res.json();
        console.log("Update result:", data);
    };


    /* ---------------- FETCH README ---------------- */
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

    /* ---------------- DND SETUP ---------------- */
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 10 }, // 🔥 prevents tiny drags
        }),
        useSensor(KeyboardSensor)
    );

    const handlePreview = () => {
        setMarkdownPreview(generateMarkdown(canvasItems));
    };

    const onDragEnd = ({ active, over }) => {
        if (!over) return;

        /* ---------- ADD FROM SIDEBAR ---------- */
        if (active.data?.current?.source === "template") {
            const templateId = active.data.current.templateId;

            const defaults = {
                header: { text: "Hi, I'm Your Name" },
                bio: { text: "Write something about yourself..." },
                skills: { skills: ["JavaScript", "React"] },
                contributions: { username: "your-github-username" },
            };

            const newItem = {
                id: `canvas-${templateId}-${Date.now()}`,
                type: templateId,
                data: defaults[templateId] || {},
            };

            // 🔑 allow drop if over canvas OR over an item
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

        /* ---------- REORDER EXISTING ITEMS ---------- */
        if (active.id?.startsWith("canvas-")) {
            const oldIndex = canvasItems.findIndex((i) => i.id === active.id);
            const newIndex = canvasItems.findIndex((i) => i.id === over.id);

            if (
                oldIndex !== -1 &&
                newIndex !== -1 &&
                oldIndex !== newIndex
            ) {
                setCanvasItems((prev) =>
                    arrayMove(prev, oldIndex, newIndex)
                );
            }
        }
    };

    const addHeaderToCanvas = (variant) => {
        const newItem = {
            id: `canvas-header-${Date.now()}`,
            type: "header",
            variant,
            data: {
                text: "Hello, I am Abhishek",
                bannerUrl: "/headers/DragonBannerHeader.png",
            },
        };

        setCanvasItems((prev) => [...prev, newItem]);
    };



    return (
        <div className="flex h-screen bg-[#0b0d0f] text-white">
            <Sidebar
                onSelectBlock={(blockId) => {
                    if (blockId === "header") {
                        setShowHeaderPicker(true);
                    }
                    setActiveBlock(blockId);
                }}
            />

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragEnd={onDragEnd}
            >
                {/* LEFT SIDEBAR */}


                {/* CENTER CANVAS */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <h2 className="text-2xl mb-4">
                        Profile README Builder
                    </h2>

                    <Canvas
                        readmeData={readme}
                        items={canvasItems}
                        setItems={setCanvasItems}
                    />
                </div>

                <HeaderVariantPicker
                    open={showHeaderPicker}
                    onClose={() => setHeaderPickerOpen(false)}
                    onSelectVariant={(variant) => {
                        console.log(variant);
                        addHeaderToCanvas(variant);
                        setShowHeaderPicker(false);
                    }}
                />

                <button onClick={updateProfileReadme}>Update</button>

            </DndContext>
        </div>
    );
}
