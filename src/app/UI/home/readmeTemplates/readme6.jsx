"use client"
import React from 'react'
import Image from 'next/image'
import { ProfileAssets } from './ProfileAssets/ProfileAssets'
import { bannerAssets } from './BannerAssets/bannerAssets'
import { ContributionGraphAssets } from './ContributionGraphAssets/ContributionGraphAssets'
import SeriesTechStack from '../FeatureGridReusables/techStacks/seriesTechStack'

const Readme6 = () => {
  return (
    <div className="w-full mx-auto bg-black rounded-lg border border-[#1f1f1f] overflow-hidden text-white">

      {/* HEADER */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1f1f1f]">
        <div>
          <h1 className="text-[12px] font-semibold">John Doe</h1>
          <p className="text-[9px] text-gray-400">Frontend Developer</p>
        </div>

        <Image
          src={ProfileAssets.ProfileImg6}
          width={32}
          height={32}
          alt="profile"
          className="rounded-full"
        />
      </div>

      <div className="p-3 space-y-3">

        {/* ABOUT */}
        <div className="flex gap-2">
          <p className="text-[10px] text-gray-300 leading-relaxed flex-1">
            I build clean and scalable UIs with strong focus on usability and performance.
          </p>

          <div className="text-[9px] text-gray-400 space-y-[2px] text-right">
            <p>🔥 120</p>
            <p>🚀 340</p>
            <p>⭐ 25</p>
          </div>
        </div>

        {/* TECH STACK */}
        <div>
          <h2 className="text-[10px] mb-1 text-gray-400">Tech Stack</h2>

          <div className="border border-[#1f1f1f] rounded-md p-2">
            <SeriesTechStack/>
          </div>
        </div>

        {/* ACTIVITY (SAME SIZE IMAGES) */}
        <div className="flex flex-col">
          <div>
            <h3 className='text-[12px] mt-3 mb-3'>Streak & Contributions</h3>
          </div>
          <div className='flex gap-2'>


          <Image
            src={bannerAssets.Streak}
            width={110}
            height={40}
            alt="streak"
            className="rounded border border-[#1f1f1f]"
            />

          <Image
            src={bannerAssets.Contribution}
            width={110}
            height={40}
            alt="contribution"
            className="rounded border border-[#1f1f1f]"
            />
            </div>

        </div>
 </div>

      {/* FOOTER */}
      <div className="relative h-18 border-[#1f1f1f]">
        <Image
          src={ProfileAssets.BannerImg7}
          alt="footer"
          fill
          className="object-cover opacity-70"
        />
      </div>

    </div>
  )
}

export default Readme6