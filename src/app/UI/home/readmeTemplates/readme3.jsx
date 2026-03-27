"use client"
import React from 'react'
import Image from 'next/image'
import { ProfileAssets } from './ProfileAssets/ProfileAssets'
import { bannerAssets } from './BannerAssets/bannerAssets'
import { ContributionGraphAssets } from './ContributionGraphAssets/ContributionGraphAssets'
import SeriesTechStack from '../FeatureGridReusables/techStacks/seriesTechStack'

const Readme3 = () => {
  return (
    <div className="w-full max-w-[420px] mx-autorounded-xl shadow-md overflow-hidden">

      {/* TOP BAR */}
      <div className="bg-black text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">John Doe</h1>
          <p className="text-[10px] opacity-70">Frontend Developer</p>
        </div>

        <Image
          src={ProfileAssets.ProfileImg3}
          height={36}
          width={36}
          alt="profile"
          className="rounded-full"
        />
      </div>

      <div className="p-4 space-y-4">

        {/* ABOUT + QUICK STATS INLINE */}
        <div className="flex gap-3">

          <p className="text-[11px] leading-relaxed text-white flex-1">
            I build clean, modern UIs with focus on performance and smooth UX.
            Turning ideas into scalable products is what I enjoy the most.
          </p>

          <div className="flex flex-col gap-1 text-[10px] text-white">
            <span>🔥 120 Streak</span>
            <span>🚀 340 Commits</span>
            <span>⭐ 25 Stars</span>
          </div>

        </div>

        {/* TECH STACK (MINIMAL STRIP STYLE) */}
        <div>
          <h2 className="text-[11px] font-semibold mb-1 text-white">
            Tech Stack
          </h2>

          <div className="border rounded-lg p-2">
            <SeriesTechStack/>
          </div>
        </div>

        {/* ACTIVITY (SIDE BY SIDE STYLE) */}
        <div className="flex gap-2">

          <div className="flex rounded-lg p-2">
            <Image
              src={bannerAssets.Streak}
              height={40}
              width={100}
              alt="streak"
              className="rounded"
            />
          </div>

          <div className="flex-1rounded-lg p-2">
            <Image
              src={bannerAssets.Contribution}
              height={40}
              width={100}
              alt="contribution"
              className="rounded"
            />
          </div>
        </div>
      </div>

      {/* FOOTER (CLEAN + SMALLER) */}
      <div className="relative h-14">
        <Image
          src={ProfileAssets.BannerImg3}
          alt="footer"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <h3 className="text-white text-[10px] font-medium tracking-wide">
            Build. Ship. Repeat.
          </h3>
        </div>
      </div>

    </div>
  )
}

export default Readme3