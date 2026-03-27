"use client"
import React from 'react'
import Image from 'next/image'
import { bannerAssets } from './BannerAssets/bannerAssets'
import { ContributionGraphAssets } from './ContributionGraphAssets/ContributionGraphAssets'
import SeriesTechStack from '../FeatureGridReusables/techStacks/seriesTechStack'
import { ProfileAssets } from './ProfileAssets/ProfileAssets'

const Readme5 = () => {
  return (
    <div className="w-full max-w-[420px] mx-auto bg-white rounded-xl shadow-md overflow-hidden">

      {/* HEADER */}
      <div className="bg-black text-white text-center py-3">
        <h1 className="text-2xl font-semibold">John Doe</h1>
        <p className="text-xs opacity-70">Frontend Developer • UI Enthusiast</p>
      </div>

      <div className="p-4 space-y-4">

        {/* ABOUT */}
        <div className="flex items-start gap-3">
          <Image
            src={ProfileAssets.ProfileImg5}
            height={50}
            width={50}
            alt="profile"
            className="rounded-full"
          />
          <p className="text-[11px] leading-relaxed text-gray-700">
            Passionate developer focused on building clean and interactive user interfaces.
            I enjoy turning ideas into real products with smooth UX and performance.
          </p>
        </div>

        {/* TECH STACK */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h2 className="text-sm font-semibold mb-2">Tech Stack</h2>
          <SeriesTechStack/>
        </div>

        {/* STATS */}
        <div className="bg-gray-50 rounded-lg">

          <div className="flex gap-2">
            <Image
              src={bannerAssets.Streak}
              height={45}
              width={110}
              alt="streak"
              className="rounded-md"
            />
            <Image
              src={bannerAssets.Contribution}
              height={45}
              width={110}
              alt="contribution"
              className="rounded-md"
            />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="relative h-16">
        <Image
          src={ProfileAssets.BannerImg5}
          alt="footer"
          fill
          className="object-cover"
        />
        
      </div>

    </div>
  )
}

export default Readme5

