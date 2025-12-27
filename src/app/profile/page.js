"use client"
import { useState,useEffect } from "react"
import UserDataBlock from "./profile-components/userDataBlock"
import UserReposBlock from "./profile-components/userReposBlock"

export default function Profile() {
    const [userData, setUserData] = useState(null)
    const [username, setUsername] = useState("abhishek5127")
    

    useEffect(()=>{
        
        const getUserData = async() => {
        
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
    setUserData(data)

  } catch (error) {
    console.error("Error fetching user data:", error);
  }
};  

  getUserData();


    },[username])

    
    return (
        <div>
            <UserDataBlock />
            <UserReposBlock />
        </div>
    )

}