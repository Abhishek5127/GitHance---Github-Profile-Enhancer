import UserDataBlock from "./profile-components/userDataBlock"
import UserReposBlock from "./profile-components/userReposBlock"

export default function profile() {
    const [userData, setUserData] = useState([{}])
    const [username, setUsername] = useState("")

    const getUserData = async() => {
        
        try {
            if (!username) {
                response.json("Username not provided")
            }
        } catch (error) {
            console.error("username", error);
        }
        
        try {
            
            const data = await fetch("/api/github",
                   username
               )
           

        } catch (error) {

        }


    }


    return (
        <div>
            <UserDataBlock />
            <UserReposBlock />
        </div>
    )

}