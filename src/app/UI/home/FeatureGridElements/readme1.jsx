import React from 'react'
import Image from 'next/image'
import { assets } from '@/app/assets/assets'
import { bannerAssets } from './BannerAssets/bannerAssets'
import SquareTechStack from '../FeatureGridReusables/techStacks/squareTechStack'

const Readme1 = () => {
  return (
    <div className=' w-full'>

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
      <div>
        <div className='text-[14px] underline'>Streak</div>
        <div className='flex m-2 gap-3'>
        <Image src={bannerAssets.Streak}
        height={40}
        width={100}
        alt='streak'
        className='rounded-[5px]'/>

         <Image src={bannerAssets.Contribution}
        height={40}
        width={100}
        alt='streak'
        className='rounded-[5px]'/>
        </div>
      </div>
      <footer className='h-20 w-[100%] relative'>
        <div className='flex justify-center w-full items-center absolute text-black top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
          <h3>Nothing Beats Consistancy</h3>
        </div>
        <Image
        src={assets.BannerImg1}
        alt='footer'
        className="w-full h-20 object-cover"/>
      </footer>
          </div>
          
    </div>
  )
}

export default Readme1