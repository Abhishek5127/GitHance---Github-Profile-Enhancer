"use client"
import React from 'react'
import Image from 'next/image'
import { assets } from '@/app/assets/assets'
import { useRouter } from 'next/navigation'

const RepoCard = ({repo,userRepos}) => {
    const router = useRouter();

    const onRepoClick = (reponame)=>{
        router.push(`/readme-analyze/${reponame}`);
        
    }


    return (
        <div>
            <div className='content-center flex-col w-60 bg-amber-300 m-5'>
                <div className='w-auto h-auto border-4 overflow-hidden content-center'>
                    <p className='absolute text-white'>{`${repo.name}`}</p>
                    <Image
                    src={assets.RepoCardBackground}
                    width={300}
                    height={250}
                    alt="repositry"/>
                </div>
                    <div onClick={()=>onRepoClick(repo.name)} className=' cursor-pointer bg-white w-full content-center'>
                       {`${repo.readme||"No Readme"}`}
                    </div>
            </div>
        </div>
    )
}

export default RepoCard
