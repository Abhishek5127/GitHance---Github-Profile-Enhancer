"use client"
import { useState,useEffect, } from "react"
import { useSession } from "next-auth/react"
import UserDataBlock from "./profile-components/UserDataBlock"
import UserReposBlock from "./profile-components/userReposBlock"

export default function Profile() {
    const [userData, setUserData] = useState(null)
    const {data:session,status}= useSession();
    

    useEffect(()=>{
        if (status !== "authenticated") return;
        const getUserData = async() => {
            const username = session.username;
        
  try {

    if (!username) {
      console.error("Username not provided");
      return;
    }

    const res = await fetch("/api/github", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    if (!res.ok) {
      throw new Error("Failed to fetch user data");
    }

    const data =  await res.json();
    console.log("User data:", data);
    setUserData(data.profile);

  } catch (error) {
    console.error("Error fetching user data:", error);
  }
};

  getUserData();


    },[session, status])


    useEffect(()=>{
      
      const getRepoData = async()=>{
        try {
          if(!username){
            console.error("username not provided")
          }

          const res = await fetch('/api/repositories',{
            method:"POST",
            headers:{"Content-Type":"Application/json"},
            body: JSON.stringify({username})
          })

          if(!res.ok){
            throw new Error("error fetching")
          }

          const data = await res.json();
          
          
        } catch (error) {
          
        }
      }
    })

    
    return (
        <div>
            <UserDataBlock userData={userData}/>
            <UserReposBlock />
        </div>
    )

}