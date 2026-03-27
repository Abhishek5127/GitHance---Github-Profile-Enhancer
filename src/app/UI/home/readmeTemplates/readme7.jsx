"use client"
import React from 'react'
import SeriesTechStack from '../FeatureGridReusables/techStacks/seriesTechStack'

const Readme7 = () => {
  return (
    <div className="max-w-[600px] mx-auto p-4 text-white bg-black font-mono">

      {/* TITLE */}
      <h1 className="text-lg font-bold">John Doe</h1>
      <p className="text-[11px] text-gray-400">
        Frontend Developer • UI Enthusiast
      </p>

      {/* LINE */}
      <hr className="my-3 border-gray-700" />

      {/* ABOUT */}
      <section className="space-y-1">
        <h2 className="text-sm font-semibold"># About</h2>
        <p className="text-[11px] text-gray-300">
          I build clean, scalable user interfaces with a focus on performance,
          usability, and consistency. Passionate about turning ideas into real products.
        </p>
      </section>

      {/* STATS */}
      <section className="mt-4 space-y-1">
        <h2 className="text-sm font-semibold"># Stats</h2>

        <ul className="text-[11px] text-gray-300 space-y-[2px]">
          <li>- 🔥 Streak: 120 days</li>
          <li>- 🚀 Commits: 340</li>
          <li>- ⭐ Stars: 25</li>
        </ul>
      </section>

      {/* TECH STACK */}
      <section className="mt-4 space-y-1">
        <h2 className="text-sm font-semibold"># Tech Stack</h2>
      </section>

      {/* PROJECTS */}
      <section className="mt-4 space-y-1">
        <h2 className="text-sm font-semibold"># Projects</h2>

        <ul className="text-[11px] text-gray-300 space-y-[2px]">
          <li>- 🔹 Project One — A modern UI system</li>
          <li>- 🔹 Project Two — Performance focused web app</li>
          <li>- 🔹 Project Three — Developer tooling</li>
        </ul>
      </section>

      {/* CONTACT */}
      <section className="mt-4 space-y-1">
        <h2 className="text-sm font-semibold"># Contact</h2>

        <ul className="text-[11px] text-gray-300 space-y-[2px]">
          <li>- 📧 email@example.com</li>
          <li>- 🌐 portfolio.com</li>
          <li>- 💼 linkedin.com/in/johndoe</li>
        </ul>
      </section>

      {/* FOOTER */}
      <div className="mt-5 pt-3 border-t border-gray-700 text-[10px] text-gray-500">
        {'>'} Consistency over motivation
      </div>

    </div>
  )
}

export default Readme7