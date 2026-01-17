import React from 'react'
import { useRouter } from 'next/navigation'



const Navbar = () => {
    const router = useRouter();
    return (
        <nav>
            <div className='relative overflow-hidden'>
                
                <div className='bg-linear-to-r from-blue-100 to-purple-900 h-20 flex flex-col relative'>

                    <div className='z-10'> 
                        <div className='flex justify-between items-center p-3'>
                            <h1 className='text-xl font-bold'>GitHance</h1>
                            <button onClick={()=>router.push('/profile')} className='w-10 h-10 bg-red-500 cursor-pointer rounded-full text-white'>A</button>
                        </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 h-2/5 backdrop-blur-md  pointer-events-none"></div>

                    <div className='flex w-full justify-center'>
                        <div className='border-b-2 border-white/30 w-[80%] absolute bottom-2 z-20'></div>
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar
