import React from "react";
import Image from "next/image";
import {assets} from "@/app/UI/home/FeatureGridElements/TechStackAssets/assets"
const SquareTechStack = () => {
  const items = [
    assets.tensorflow,
    assets.terraform,
    assets.trello,
    assets.turbo,
    assets.turborepo,
    assets.twilio,
    assets.vault,
    assets.vuetify,
    assets.vulkan,
    assets.vyper,
    assets.waku,
    assets.yaml,
    assets.yarn,
    assets.vaadin,
    assets.vagrant,
    assets.vapor,
  ];

  return (
    <div className="w-full flex m-2">
      <div className="grid grid-cols-4">
        {items.map((img, i) => (
          <div
            key={i}
            className="w-6 h-6 flex items-center justify-center transition"
          >
            <Image
              src={img}
              alt={`tech-${i}`}
              width={15}
              height={15}
              className="object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SquareTechStack;