import React from 'react'
import Image from 'next/image'
import { assets } from '@/app/assets/assets'
import SquareTechStack from '../FeatureGridReusables/techStacks/squareTechStack'

const Readme1 = () => {
  return (
    <div className='w-full'>

      <h1 className='text-3xl font-serif bg-green-600 p-2 w-full text-center'>
        John Doe
      </h1>
      <div className='p-3'>

      <div className='flex text-[8px] m-2 gap-3'>
        <p><b>I’m a graphic designer</b> who loves making complex ideas look beautifully simple.
          I specialize in digital design and branding, partnering with people to bring their best visions to life.
          Let's team up and create something your audience won't be able to ignore.</p>
        <Image
          src={assets.ProfileImg1}
          height={45}
          width={45}
          alt='profile-img'
          className='rounded-full' />
      </div>
      <div>
        <div className='text-[14px] underline'>Tech Stack</div>
        <div>
          <SquareTechStack/>
        </div>
        
      </div>
          </div>
    </div>
  )
}

export default Readme1