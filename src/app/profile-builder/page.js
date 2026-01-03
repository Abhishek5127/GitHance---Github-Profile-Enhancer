"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import generateMarkdown from "../lib/genrateMarkdown";
import MarkdownPreview from "../components/markdownPreview";
import {
    DndContext,
    closestCorners,
    PointerSensor,
    useSensor,
    useSensors,
    KeyboardSensor,
} from "@dnd-kit/core";

import { arrayMove } from "@dnd-kit/sortable";
import Sidebar from "../components/Sidebar";
import Canvas from "../components/Canvas";

export default function Page() {

    const [canvasItems, setCanvasItems] = useState([]);
    const { data: session, status } = useSession();
    const [readme, setReadme] = useState("")


    useEffect(() => {
        const fetchReadme = async () => {
            try {
                if (!session?.username) return;

                const res = await fetch("/api/Profile-Readme", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username: session.username }),
                });

                const data = await res.json();
                setReadme(data.readme)
                console.log(data.readme);
            } catch (error) {
                console.error("Failed to fetch profile README", error);
            }
        };

        fetchReadme();
    }, [session?.username]);


    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );
    const [markdownPreview, setMarkdownPreview] = useState("");



    const handlePreview = () => {
        const md = generateMarkdown(canvasItems);
        setMarkdownPreview(md); // sets the dragged items as markdown
    }


    const onDragEnd = (event) => {
        const { active, over } = event;
        if (!over) return;

        // If dragging a template from sidebar (id like "template:header")
        if (active.data?.current?.source === "template") {
            const templateId = active.data.current.templateId;

            let defaultData = {};

            if (templateId === "header") {
                defaultData = { text: "Hi, I'm Your Name" };
            }

            if (templateId === "bio") {
                defaultData = { text: "Write something about yourself..." };
            }

            if (templateId === "skills") {
                defaultData = { skills: ["JavaScript", "React"] };
            }

            if (templateId === "contributions") {
                defaultData = { username: "your-github-username" };
            }

            const newItem = {
                id: `canvas-${templateId}-${Date.now()}`,
                type: templateId,
                data: defaultData,
            };

            // dropped onto empty canvas area
            if (over.id === "canvas") {
                setCanvasItems((prev) => [...prev, newItem]);
                return;
            }

            // dropped over a canvas item => insert before it
            const idx = canvasItems.findIndex((i) => i.id === over.id);
            if (idx === -1) {
                setCanvasItems((prev) => [...prev, newItem]);
            } else {
                setCanvasItems((prev) => {
                    const copy = [...prev];
                    copy.splice(idx, 0, newItem);
                    return copy;
                });
            }
            return;
        }

        // If moving existing canvas item (id starts with "canvas-")
        if (active.id && active.id.startsWith("canvas-")) {
            const oldIndex = canvasItems.findIndex((i) => i.id === active.id);
            // dropped on canvas empty area => move to end
            if (over.id === "canvas") {
                const copy = [...canvasItems];
                const [moved] = copy.splice(oldIndex, 1);
                copy.push(moved);
                setCanvasItems(copy);
                return;
            }
            const newIndex = canvasItems.findIndex((i) => i.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                setCanvasItems((prev) => arrayMove(prev, oldIndex, newIndex));
            }
        }
    };

    return (
        <div className="flex h-screen bg-[#0b0d0f]">
            <DndContext

                sensors={sensors}
                collisionDetection={closestCorners}
                onDragEnd={onDragEnd}
            >
                <Sidebar />
                <div className="flex-1 p-6">
                    <h2 className="text-2xl text-white mb-4">Profile README Builder</h2>
                    <Canvas readmeData={readme} items={canvasItems} setItems={setCanvasItems} />
                </div>
            </DndContext>

            <button
                onClick={handlePreview}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            >
                Preview README
            </button>

            <div className="mt-4">
                <MarkdownPreview markdown={markdownPreview} />
            </div>
        </div >
    );
}
