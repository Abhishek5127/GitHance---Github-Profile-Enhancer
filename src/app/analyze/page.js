"use client"
import React from 'react'

const page = () => {
    const analyzeProfile = async()=>{
    return;
}

  return (
    <div>
      <div className='flex flex-col'>
        <h2>Enter your Git Username:</h2>
        <input className='border-2' name='username' type="text" />
        <button className='cursor-pointer' onClick={analyzeProfile} >Analyze</button>
      </div>
    </div>
  )
}

export default page
