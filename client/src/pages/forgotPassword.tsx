import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import axios from 'axios'

type passwordResponse={
    message:string
}
type verifypasswordResponse={
    message:string,
    email:string
}

export const ForgotPassword=()=>{


const[email , setEmail] = useState("")
const[password , setPassword] =  useState("")
const[confirmpassword , setConfirmpassword] = useState("")
const[isset , setIsset] = useState(false)

const {resetToken} = useParams()
const navigate = useNavigate()

useEffect(()=>{
    if(resetToken){
    try {
        const resetPasswordfn = async () => {
        const response = await axios.get<verifypasswordResponse>(`${import.meta.env.VITE_URL}/api/v1/user/reset-password/${resetToken}`)
        alert(response.data.message)
        setEmail(response.data.email)
        setIsset(true)
        }
        resetPasswordfn()
    } catch (error:any) {
            alert(error.response.data.error)
        }
    }
},[])

if(isset){
    return(
        <div className="h-screen w-screen flex justify-center items-center">
            <div className="h-[300px] w-[300px] rounded-lg shadow-lg p-4">
                <div className="flex flex-col p-2 gap-2">
                    <div>Password</div>
                    <input type="password" placeholder="******" className="border border-blue-200 bg-slate-100 p-2 w-full"
                    value={password} onChange={(e)=>{setPassword(e.target.value)}}/>
                </div>
                <div className="flex flex-col p-2 gap-2">
                    <div>Confirm Password</div>
                    <input type="password" placeholder="*******" className="border border-blue-200 bg-slate-100 p-2 w-full"
                    value={confirmpassword} onChange={(e)=>{setConfirmpassword(e.target.value)}} />
                </div>
                <div className="p-2">
                    <button className=" p-2 bg-blue-400 w-full rounded-lg text-white" onClick={async () => {

                    try {
                    const response = await axios.put<passwordResponse>(`${import.meta.env.VITE_URL}/api/v1/user/reset-password`, {
                        password,
                        confirmpassword,
                        email
                       })
                        alert(response.data.message)
                        navigate("/signin")
                    } catch (error:any) {
                        alert(error.response.data.error)
                    }
                        
                    }} >Submit</button>
                </div>
                
            </div>
        </div>
    )
}

return(
        <div className="h-screen w-screen flex justify-center items-center">
            <div className="h-[200px] w-[300px] rounded-lg shadow-lg p-4">
                <div className="flex flex-col p-2 gap-2" >
                    <div className="p-2" >Email</div>
                    <input type="email" placeholder="abc@gmail.com" className="border border-blue-200 bg-slate-100 p-2 w-full"
                    value={email} onChange={(e)=>{setEmail(e.target.value)}} />
                </div>
                <button className="m-2 p-2 bg-blue-400 w-full rounded-lg text-white" 
                onClick={async () => {
                    try {
                        const response = await axios.post<passwordResponse>(`${import.meta.env.VITE_URL}/api/v1/user/forgot-password` , {
                            email
                        })
                        alert(response.data.message)
                    } catch (error:any) {
                        alert(error?.response?.data?.message || "Something went wrong")
                    }
                }}>Submit</button>
                
            </div>
        </div>
    )
}