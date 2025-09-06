import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom' 
import axios from "axios"

type signinResponse = {
    token:string,
    message:string
}
function Signin(){
    const [email , setEmail] = useState("")
    const [password , setPassword] = useState("")
    
    const navigate = useNavigate()

    return (
       <div className='w-screen h-screen flex justify-center items-center'>
          <div className='w-[400px] h-[450px] bg-gray-50 rounded-lg shadow-md p-4 '>
            <div className='flex justify-center'>
                <p className='font-bold text-2xl'>Get Started</p>
            </div>
            <div className='flex justify-center p-3 gap-2 text-blue-400 font-semibold'>
                <h1>Don't Have an Account?</h1>
                <Link to='/Signup' className='underline'>Sign up</Link>
            </div>
           
            <div className='flex flex-col gap-1.5 p-2'>
                <div className='p-2'>Email</div>
                <input type="email" placeholder='abc@gmail.com' className='border border-slate-500 p-2 bg-slate-100 rounded-lg w-full'
                value={email} onChange={(e)=>{setEmail(e.target.value)}} />
            </div>
            <div className='flex flex-col gap-1.5 p-2'>
                <div className='p-2'>Password</div>
                <input type="password" placeholder='*********' className='border border-slate-500 p-2 bg-slate-100 rounded-lg w-full'
                value={password} onChange={(e)=>{setPassword(e.target.value)}} />
            </div>
            
            <button className=' bg-sky-600 rounded-md p-1 mt-6 mb-6 w-full text-white' onClick={async () => {
                
                try {
                const response = await axios.post<signinResponse>(`${import.meta.env.VITE_URL}/api/v1/user/signin` , {
                    email,
                    password
                })
                alert(response.data.message)
                sessionStorage.setItem('token', response.data.token)
                navigate("/")
                } catch (error:any) {
                    alert(error.response.data.error)
                    navigate("/verifyemail")
                }
            }}>Sign In</button>

            <div className='flex justify-center items-center'>
                <Link to='/forgot-password' className='text-blue-400 underline' >Forgot Password</Link>
            </div>
            
          </div>
        </div>
    )

}

export default Signin;