"use client";

import {
    DndContext,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable } from "@dnd-kit/sortable";
import Sidebar from "@/app/components/Sidebar";
import BuilderCanvas from "@/app/components/BuilderCanvas";
import HeaderBlock from "@/app/components/blocks/HeaderBlock";
import BioBlock from "@/app/components/blocks/BioBlock";
import { useState } from "react";

export default function Page() {
    const [canvasItems, setCanvasItems] = useState([]);

    const onDragEnd = (event) => {
        const { over, active } = event;

        if (!over) return;

        // If dragging from sidebar → Add new component
        if (over.id === "canvas") {
            const newId = `${active.id}-${Date.now()}`;

            setCanvasItems((prev) => [...prev, { id: newId, type: active.id }]);
            return;
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 5px movement to trigger drag
            },
        }),
        useSensor(KeyboardSensor)
    );


    return (
        <div className="flex">
            <Sidebar />

            <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <BuilderCanvas>
                    <SortableContext items={canvasItems.map((i) => i.id)}>
                        {canvasItems.map((item) => (
                            <CanvasElement key={item.id} item={item} />
                        ))}
                    </SortableContext>
                </BuilderCanvas>
            </DndContext>
        </div>
    );
}

// Renders the dropped block with correct component
function CanvasElement({ item }) {
    const { attributes, listeners, setNodeRef, transform } = useSortable({
        id: item.id,
    });

    const style = {
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : "",
    };

    const Component = {
        header: HeaderBlock,
        bio: BioBlock,
    }[item.type];

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            <Component />
        </div>
    );
}
