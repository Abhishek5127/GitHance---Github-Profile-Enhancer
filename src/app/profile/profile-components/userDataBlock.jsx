import React from 'react'
import Image from 'next/image'

const userDataBlock = () => {
    return (
        <div className="w-full bg-white shadow-sm overflow-hidden">
      {/* Top gradient */}
      <div className="h-25 w-full bg-linear-to-r from-indigo-300 via-purple-300 to-pink-300" />

      <div className="flex items-center justify-between px-8 py-6">
        {/* Left */}
        <div className="flex items-center gap-6">
          <Image
            src="https://avatars.githubusercontent.com/u/206503696?v=4"
            alt="Profile"
            width={112}
            height={112}
            className="-mt-14 rounded-2xl border-4 border-white object-cover"
          />

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Irene Brooks
              </h2>
              <span className="rounded-md bg-indigo-500 px-2 py-0.5 text-xs font-medium text-white">
                PRO ⚡
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-600">
              Interface and Brand Designer <br />
              based in San Antonio
            </p>

            <div className="mt-4 flex gap-3">
              <button className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white">
                Follow
              </button>
              <button className="rounded-md border px-4 py-2 text-sm text-gray-700">
                Get in touch
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-10 text-center">
          <div>
            <p className="text-sm text-gray-500">Followers</p>
            <p className="text-xl font-semibold">2,985</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Following</p>
            <p className="text-xl font-semibold">132</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Likes</p>
            <p className="text-xl font-semibold">548</p>
          </div>
        </div>
      </div>
    </div>

    )
}

export default userDataBlock
