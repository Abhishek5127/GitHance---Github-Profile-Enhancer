"use client";

import { useState } from "react";
import {
    DndContext,
    closestCorners,
    PointerSensor,
    useSensor,
    useSensors,
    KeyboardSensor,
} from "@dnd-kit/core";

import { arrayMove } from "@dnd-kit/sortable";

import Sidebar from "@/app/components/Sidebar";
import Canvas from "@/app/components/Canvas";

/**
 * canvasItems: array of { id: "canvas-163234234", type: "header", data: {} }
 */
export default function Page() {
    const [canvasItems, setCanvasItems] = useState([]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const onDragEnd = (event) => {
        const { active, over } = event;

        // If nothing was dropped over, do nothing
        if (!over) return;

        // If dragging a template from the sidebar (we mark templates with id starting with "template:")
        if (active.data?.current?.source === "template") {
            // active.id is like "template:header"
            const templateId = active.data.current.templateId; // "header"
            // If dropped on canvas directly (over.id === "canvas") -> append
            // If dropped on a canvas item (over.id === canvasItemId) -> insert before that item
            if (over.id === "canvas") {
                const newItem = {
                    id: `canvas-${templateId}-${Date.now()}`,
                    type: templateId,
                    data: {}, // future: template defaults or user-edited data
                };
                setCanvasItems((prev) => [...prev, newItem]);
            } else {
                // over is a canvas item id
                const index = canvasItems.findIndex((i) => i.id === over.id);
                const newItem = {
                    id: `canvas-${templateId}-${Date.now()}`,
                    type: templateId,
                    data: {},
                };
                setCanvasItems((prev) => {
                    const copy = [...prev];
                    copy.splice(index, 0, newItem);
                    return copy;
                });
            }
            return;
        }

        // If dragging an existing canvas item (id starts with "canvas-") -> reorder
        if (active.id && active.id.startsWith("canvas-")) {
            // If dropped on the canvas container (empty area) or over another canvas item
            const oldIndex = canvasItems.findIndex((i) => i.id === active.id);
            // if over is 'canvas' -> move to end
            if (over.id === "canvas") {
                const copy = [...canvasItems];
                const [moved] = copy.splice(oldIndex, 1);
                copy.push(moved);
                setCanvasItems(copy);
                return;
            }
            const newIndex = canvasItems.findIndex((i) => i.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                setCanvasItems((prev) => arrayMove(prev, oldIndex, newIndex));
            }
        }
    };

    return (
        <div className="flex h-screen">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragEnd={onDragEnd}
            >

                <Sidebar />

                <div className="flex-1 p-6">
                    <h2 className="text-2xl mb-4">Profile README Builder</h2>

                    <Canvas items={canvasItems} setItems={setCanvasItems} />
                </div>
            </DndContext>
        </div >
    
  );
}
