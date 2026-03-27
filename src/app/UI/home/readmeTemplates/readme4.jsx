"use client"
import React from 'react'
import Image from 'next/image'
import { ProfileAssets } from './ProfileAssets/ProfileAssets'
import { bannerAssets } from './BannerAssets/bannerAssets'
import SeriesTechStack from '../FeatureGridReusables/techStacks/seriesTechStack'

const Readme4 = () => {
  return (
    <div className="w-full max-w-[420px] mx-auto rounded-2xl overflow-hidden 
    bg-[#0b0f19] shadow-xl text-white">

      {/* TOP VISUAL SECTION */}
      <div className="relative h-28">

        <Image
          src={ProfileAssets.BannerImg4}
          alt="banner"
          fill
          className="object-cover opacity-60"
        />

        {/* overlay glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0b0f19]" />

        {/* profile floating */}
        <div className="absolute bottom-[-18px] left-4 flex items-center gap-3">
          <Image
            src={ProfileAssets.ProfileImg5}
            height={44}
            width={44}
            alt="profile"
            className="rounded-full border-2 border-white/30"
          />

          <div>
            <h1 className="text-sm font-semibold">John Doe</h1>
            <p className="text-[10px] text-white/60">Frontend Developer</p>
          </div>
        </div>

      </div>

      {/* CONTENT */}
      <div className="pt-6 p-4 space-y-4">

        {/* ABOUT */}
        <div className="text-[11px] text-white/80 leading-relaxed">
          I build clean, modern UIs with focus on performance and smooth UX.
          Turning ideas into scalable products is what I enjoy the most.
        </div>

        {/* STATS INLINE STRIP */}
        <div className="flex text-[8px] gap-1">

          <div className="bg-white/5 px-2 py-1 rounded-md border border-white/10">
            🔥 120
          </div>

          <div className="bg-white/5 px-2 py-1 rounded-md border border-white/10">
            🚀 340
          </div>

          <div className="bg-white/5 px-2 py-1 rounded-md border border-white/10">
            ⭐ 25
          </div>

        </div>

        {/* TECH STACK FLOAT */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-2 border border-white/10">
          <p className="text-[10px] mb-1 text-white">Tech Stack</p>
          <SeriesTechStack/>
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center text-[16px] h-22 text-white py-3 border-t border-white/10">
        Build. Ship. Repeat.
      </div>

    </div>
  )
}

export default Readme4