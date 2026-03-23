import React from 'react'
import { assets } from '../../FeatureGridElements/TechStackAssets/assets'

const seriesTechStack = () => {

  const techStacks = {
    languages: [
      assets.xml,
      assets.yaml,
      assets.vala,
      assets.vyper,
    ],

    databases: [
      assets.vault, // kinda secret storage but fits here loosely
      assets.xinference,
    ],

    librariesFrameworks: [
      assets.tensorflow,
      assets.vuetify,
      assets.vuestorefront,
      assets.vapor,
      assets.vaadin,
    ],

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
    ]
  }

  const renderStack = (items) => {
    return items.map((item, index) => (
      <img
        key={index}
        src={item.src}
        alt="tech"
        className="w-4 h-4 object-contain"
      />
    ))
  }

  return (
    <div className="">

      <div>
        <h1 className='text-black text-[8px] mt-2'>Languages</h1>
        <div className="flex gap-2 flex-wrap">
          {renderStack(techStacks.languages)}
        </div>
      </div>

      <div>
        <h1 className='text-black text-[8px] mt-2'>Database</h1>
        <div className="flex gap-2 flex-wrap">
          {renderStack(techStacks.databases)}
        </div>
      </div>

      <div>
        <h1 className='text-black text-[8px] mt-2'>Libraries & Frameworks</h1>
        <div className="flex gap-2 flex-wrap">
          {renderStack(techStacks.librariesFrameworks)}
        </div>
      </div>

      <div>
        <h1 className='text-black text-[8px] mt-2'>Tools & Platforms:</h1>
        <div className="flex gap-2 flex-wrap">
          {renderStack(techStacks.toolsPlatforms)}
        </div>
      </div>

    </div>
  )
}

export default seriesTechStack