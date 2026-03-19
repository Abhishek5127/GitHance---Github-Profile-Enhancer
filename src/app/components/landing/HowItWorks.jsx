"use client"

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { assets } from '@/app/assets/assets'

const sections = [
  {
    id: 0,
    index: 1,
    title: 'Connect GitHub',
    description: 'Securely connect your GitHub using OAuth authentication. Fetch repositories and essential data instantly. Get everything ready for analysis in seconds.'
  },
  {
    id: 1,
    index: 2,
    title: 'Analyze Repository',
    description: 'Scan your codebase, commits, and project structure deeply. Identify patterns, dependencies, and potential issues. Understand how your project is built internally.'
  },
  {
    id: 2,
    index: 3,
    title: 'Generate Insights',
    description: 'AI transforms raw repository data into clear explanations. Break down complex code into understandable insights. Learn how your project evolved over time.'
  },
  {
    id: 3,
    index: 4,
    title: 'Improve & Share',
    description: 'Get actionable suggestions to improve code quality. Optimize structure and maintainability easily. Share insights with others through clean reports.'
  },
]

const sectionImages = [
  assets.ProfileAnalytics,
  assets.ReadmeBuilder,
  assets.ReadmeEditor,
  assets.GithubProfile
]

const HowItWorks = () => {
  const [isActiveSection, setIsActiveSection] = useState(0)
  const [starY, setStarY] = useState(0)
  const [imageStep, setImageStep] = useState(0)

  const itemRefs = useRef([])
  const carouselRef = useRef(null)

  useEffect(() => {
    const updatePositions = () => {
      const activeItem = itemRefs.current[isActiveSection]

      if (activeItem) {
        const top = activeItem.offsetTop
        const height = activeItem.offsetHeight

        setStarY(top + height / 2 - 15)
      }

      if (carouselRef.current) {
        setImageStep(carouselRef.current.offsetHeight)
      }
    }

    updatePositions()

    let resizeObserver

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updatePositions)

      itemRefs.current.forEach((item) => {
        if (item) {
          resizeObserver.observe(item)
        }
      })

      if (carouselRef.current) {
        resizeObserver.observe(carouselRef.current)
      }
    }

    window.addEventListener('resize', updatePositions)

    return () => {
      window.removeEventListener('resize', updatePositions)
      resizeObserver?.disconnect()
    }
  }, [isActiveSection])

  const rotation = isActiveSection * 90

  return (
    <section className='mx-auto mt-20 w-full max-w-7xl px-4 pb-20 sm:mt-24 lg:mt-32'>
      <div className='flex w-full flex-col'>
        <h1 className='text-3xl sm:ml-3 sm:text-4xl lg:text-5xl'>How it works</h1>
        <div className='mb-8 flex justify-end text-sm text-[#ff7a1a] sm:mb-10 sm:mr-6 sm:text-base lg:mr-10'>
          //PROCESS
        </div>

        <div className='flex flex-col items-start gap-10 lg:flex-row lg:justify-around lg:gap-8'>
          <div className='relative flex w-full flex-col pl-10 sm:pl-12 lg:max-w-xl lg:pl-0'>
            <div
              className='absolute left-0 transition-transform duration-500 ease-in-out lg:left-[-40px]'
              style={{
                transform: `translateY(${starY}px) rotate(${rotation}deg)`
              }}
            >
              <Image
                src={assets.Star}
                height={30}
                width={30}
                alt='star svg'
              />
            </div>

            {sections.map((section, index) => (
              <button
                key={section.id}
                type='button'
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                onClick={() => setIsActiveSection(section.id)}
                className={`mb-6 flex w-full cursor-pointer flex-col gap-3 p-3 text-left duration-300 focus:outline-none ${
                  isActiveSection === section.id
                    ? 'translate-x-4 text-[#fb460d] opacity-100 sm:translate-x-6 lg:translate-x-8'
                    : 'opacity-30'
                }`}
              >
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='text-lg sm:text-xl lg:text-2xl'>0{section.index}</span>
                  <h2 className='text-2xl leading-tight sm:text-3xl lg:text-4xl'>{section.title}</h2>
                </div>
                <p className='max-w-2xl text-sm leading-6 sm:text-base'>{section.description}</p>
              </button>
            ))}
          </div>

          <div
            ref={carouselRef}
            className='relative h-[280px] w-full max-w-[420px] self-center overflow-hidden bg-black sm:h-[380px] lg:h-[500px] lg:self-auto'
          >
            <div
              className='absolute w-full transition-transform duration-700 ease-in-out'
              style={{
                transform: `translateY(-${isActiveSection * imageStep}px)`
              }}
            >
              {sectionImages.map((img, index) => (
                <div
                  key={index}
                  className='flex h-[280px] items-center justify-center sm:h-[380px] lg:h-[500px]'
                >
                  <Image
                    src={img}
                    height={600}
                    width={400}
                    alt='carousel image'
                    className='h-auto w-[85%] max-w-[400px] sm:w-[88%] lg:w-[95%]'
                    sizes='(min-width: 1024px) 400px, (min-width: 640px) 60vw, 85vw'
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
