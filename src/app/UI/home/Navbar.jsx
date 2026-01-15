import React from 'react'

const Navbar = () => {
    return (
        <nav>
            <div className='relative'>
                <div className='bg-white h-20 flex flex-col'>
                    <div className=''>
                        <div className='flex justify-between bg-amber-900'>
                            <h1 className='text-xl p-3'>GitHance</h1>
                            <div>
                                <button className='w-12 h-12 p-1 left-2 bg-red-500 cursor-pointer rounded-full'>A</button>
                            </div>
                        </div>
                        <div className='flex w-full items-center content-center'>

                            <div className='border-b-2 w-[80%] absolute bottom-2'></div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar
