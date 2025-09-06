import axios from "axios"
import { useEffect, useState } from "react"
import { useParams , Link} from "react-router-dom"

type verifyEmailResponse= {
    verified:boolean,
    message:string
}

export const Verify=()=>{

    const {verificationtoken} = useParams()
    const [verified , setVerified] = useState(false)


    useEffect(()=>{
        const verifyEmail = async () => {
            if(verificationtoken){
                try {
                    const response = await axios.put<verifyEmailResponse>(`${import.meta.env.VITE_URL}/api/v1/user/verify/${verificationtoken}` )
                    alert(response.data.message)
                    setVerified(response.data.verified)
                } catch (error:any) {
                    console.error(error)
                    alert(error.response.data.error)
                }             
            }
        }

        verifyEmail()

    } , [])

    if(verified){
        return (
            <div className="h-screen w-screen flex flex-col">
                <div className="p-6 m-6">
                    Your Email has been verified Sucessfully
                </div>
                <Link to="/signin" className="p-6 m-6">Go To SIGNIN page</Link>

            </div>
        )
    }   
    
    return (
    <div className="h-screen w-screen flex justify-center items-center ">
        <div className="flex flex-col h-[300px] w-[400px] bg-blue-100 justify-center items-center rounded-lg p-4 m-4">
            <div className="p-4">
                <h6 className="font-bold">Your E-mail verifcation link has been sent to your mail box</h6>
            </div>
            <div className="p-4">
                <a href="https://gmail.com" className="bg-blue-500 text-white">Go to MailBox</a>
            </div>
        </div>
    </div>
    )
}