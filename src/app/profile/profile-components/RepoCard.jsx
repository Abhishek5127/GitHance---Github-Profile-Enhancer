import React from 'react'
import Image from 'next/image'
import { assets } from '@/app/assets/assets'
const RepoCard = () => {
    return (
        <div>
            <div className='content-center flex-col w-60 bg-amber-300'>
                <div className='w-auto h-auto border-4 overflow-hidden content-center'>
                    <p className='absolute'>repoName</p>
                    <Image
                    src={assets.RepoCardBackground}
                    width={300}
                    height={250}
                    alt="repositry"/>
                </div>
                    <div className='bg-white w-full content-center'>
                        check if there is readme
                    </div>
            </div>
        </div>
    )
}

export default RepoCard
