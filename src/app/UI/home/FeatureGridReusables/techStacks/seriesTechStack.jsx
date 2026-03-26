import React from "react";
import SafeImage from "@/app/components/seo/SafeImage";
import { assets } from "../../FeatureGridElements/TechStackAssets/assets";

const SeriesTechStack = () => {
  const techStacks = {
    languages: [assets.xml, assets.yaml, assets.vala, assets.vyper],
    databases: [assets.vault, assets.xinference],
    librariesFrameworks: [assets.tensorflow, assets.vuetify, assets.vuestorefront, assets.vapor, assets.vaadin],
    toolsPlatforms: [
      assets.tencentcloud,
      assets.terraform,
      assets.terramate,
      assets.trello,
      assets.tripo,
      assets.turbo,
      assets.turborepo,
      assets.twilio,
      assets.vagrant,
      assets.vulkan,
      assets.waku,
      assets.xuanyuan,
      assets.yarn,
    ],
  };

  const renderStack = (items) => {
    return items.map((item, index) => (
      <SafeImage
        key={`${item.src}-${index}`}
        src={item.src}
        alt="Technology icon"
        width={16}
        height={16}
        className="h-4 w-4 object-contain"
      />
    ));
  };

  return (
    <div>
      <div>
        <h2 className="mt-2 text-[8px] text-black">Languages</h2>
        <div className="flex flex-wrap gap-2">{renderStack(techStacks.languages)}</div>
      </div>

      <div>
        <h2 className="mt-2 text-[8px] text-black">Database</h2>
        <div className="flex flex-wrap gap-2">{renderStack(techStacks.databases)}</div>
      </div>

      <div>
        <h2 className="mt-2 text-[8px] text-black">Libraries &amp; Frameworks</h2>
        <div className="flex flex-wrap gap-2">{renderStack(techStacks.librariesFrameworks)}</div>
      </div>

      <div>
        <h2 className="mt-2 text-[8px] text-black">Tools &amp; Platforms</h2>
        <div className="flex flex-wrap gap-2">{renderStack(techStacks.toolsPlatforms)}</div>
      </div>
    </div>
  );
};

export default SeriesTechStack;

