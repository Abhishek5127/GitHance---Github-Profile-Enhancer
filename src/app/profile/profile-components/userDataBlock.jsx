import React from 'react'
import Image from 'next/image'

const userDataBlock = () => {
  return (
    <div>
        <div>
            <div>
                <div>
                    <div>
                        <Image
                        src={"https://avatars.githubusercontent.com/u/206503696?v=4"}
                        width={500}
                        height={500}
                        alt='profile-avtar'
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
  )
}

export default userDataBlock
