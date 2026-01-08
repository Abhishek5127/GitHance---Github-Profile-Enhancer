import React from 'react'
import RepoCard from './RepoCard'


const userReposBlock = ({userRepos}) => {

  return (
    <div className='bg-[#010409] flex'>
        {userRepos.map((repo)=>(
          <RepoCard key={repo.id} repo={repo}/>
        ))}
    </div>
  )
}

export default userReposBlock
