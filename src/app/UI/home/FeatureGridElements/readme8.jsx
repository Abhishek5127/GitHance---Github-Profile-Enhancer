"use client"
import React from 'react'

const Badge = ({ label, color = "#30363d" }) => (
  <span
    className="px-1.5 py-[1px] text-[9px] rounded border border-[#30363d] text-white"
    style={{ backgroundColor: color }}
  >
    {label}
  </span>
)

const Readme8 = () => {
  return (
    <div className="max-w-[640px] h-full mx-auto p-3 bg-black text-gray-300 font-mono text-[10px] leading-snug">

      {/* TITLE */}
      <h1 className="text-[14px] font-semibold text-white">John Doe</h1>
      <p className="text-[9px] text-gray-400">
        Frontend Developer • UI Focused • Open Source
      </p>

      <hr className="my-2 border-[#21262d]" />

      {/* TOP BADGES */}
      <div className="flex flex-wrap gap-1 mb-3">
        <Badge label="Frontend" color="#1f6feb" />
        <Badge label="React" color="#61dafb" />
        <Badge label="Next.js" color="#000000" />
        <Badge label="Tailwind" color="#38bdf8" />
        <Badge label="UI/UX" color="#a855f7" />
        <Badge label="Open Source" color="#22c55e" />
      </div>

      {/* ABOUT */}
      <section className="space-y-[2px]">
        <h2 className="text-[11px] text-white">## About</h2>
        <p className="text-[9px] text-gray-400">
          Building clean, scalable and maintainable interfaces with strong focus on performance,
          accessibility and consistency. I enjoy working on real-world products and improving UX
          through small but impactful details.
        </p>
      </section>

      {/* TECH STACK */}
      <section className="mt-3 space-y-[2px]">
        <h2 className="text-[11px] text-white">## Tech</h2>

        <div className="flex flex-wrap gap-1 mt-1">
          <Badge label="JavaScript" color="#f7df1e" />
          <Badge label="TypeScript" color="#3178c6" />
          <Badge label="React" color="#61dafb" />
          <Badge label="Next.js" color="#000000" />
          <Badge label="Node.js" color="#3c873a" />
          <Badge label="Express" color="#6b7280" />
          <Badge label="MongoDB" color="#4db33d" />
          <Badge label="Firebase" color="#ffca28" />
          <Badge label="Git" color="#f05032" />
          <Badge label="Docker" color="#2496ed" />
          <Badge label="Vercel" color="#000000" />
        </div>
      </section>

      {/* STATS */}
      <section className="mt-3 space-y-[2px]">
        <h2 className="text-[11px] text-white">## Stats</h2>

        <ul className="text-[9px] text-gray-400 space-y-[1px]">
          <li>- 🔥 120 day streak with consistent contributions</li>
          <li>- 🚀 340+ commits across personal and collaborative projects</li>
          <li>- ⭐ 25+ stars on open source repositories</li>
        </ul>
      </section>

      {/* PROJECTS */}
      <section className="mt-3 space-y-[2px]">
        <h2 className="text-[11px] text-white">## Projects</h2>

        <ul className="text-[9px] text-gray-400 space-y-[1px]">
          <li>- UI System → reusable component architecture</li>
          <li>- Web App → performance focused frontend</li>
          <li>- Dev Tools → utilities for developers</li>
        </ul>
      </section>

      {/* CONTACT */}
      <section className="mt-3 space-y-[2px]">
        <h2 className="text-[11px] text-white">## Contact</h2>

        <div className="flex flex-wrap gap-1 mt-1">
          <Badge label="email@example.com" color="#30363d" />
          <Badge label="portfolio.com" color="#30363d" />
          <Badge label="linkedin/johndoe" color="#0a66c2" />
          <Badge label="github/johndoe" color="#24292f" />
        </div>
      </section>

      {/* FOOTER */}
      <div className="mt-4 pt-2 border-t border-[#21262d] text-[8px] text-gray-600">
        Consistency &gt; Motivation
      </div>

    </div>
  )
}

export default Readme8