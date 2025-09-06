import React, { useEffect, useRef, useState } from 'react'
import image from '../assets/logo.png'
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/zustand';


interface getuserResponse{
    name:string
}

interface Document{
    id:number
    title?:string
    content?:string
    updatedAt:string
    userId:number
}

interface getdocresponse{
    filteredDocuments:Document[]
}

const Navbar=()=>{

    const [name , setName] = useState("")
    const token = sessionStorage.getItem('token')
    const [isOpen , setisopen] = useState(false)
    const [position , setPosition] = useState({top:0 , left:0})
    const debounce = useRef<number | null>(null)
    const { setDocuments } = useStore()
    const getDocuments = useStore(state => state.getDocuments)

    const navigate = useNavigate()

   useEffect(()=>{
    if(!token){
        return alert("Token is missing")
    }
        try {
        const getuser = async()=>{
        const response = await axios.get<getuserResponse>(`${import.meta.env.VITE_URL}/api/v1/user/`, {
            headers:{
                authorization:token
            }
        })
        console.log(response.data.name)
       setName(response.data.name)
    }
    getuser()
        } catch (error:any) {
            alert(error.response.data.error)
        }
   },[])

   const handlePosition = (e:React.MouseEvent)=>{
    const rect = e.currentTarget.getBoundingClientRect()
    setPosition({top:rect.bottom + window.scrollY ,
        left:rect.left + window.scrollX
    })
    setisopen(!isOpen)
   }

   const filterdocs = async (filter:string) => {
    if(debounce.current){
        clearTimeout(debounce.current)
    }
    
        try {
            debounce.current = setTimeout(async() => {
                if(filter==""){
                    getDocuments()
                    return;
                }

                const response = await axios.get<getdocresponse>(`${import.meta.env.VITE_URL}/api/v1/document/?filter=${filter}` , {
                    headers:{
                        authorization: sessionStorage.getItem('token')
                    }
                })
                setDocuments(response.data.filteredDocuments)
            }, 300);
        } catch (error:any) {
            alert(error.response.data.error)
        }
    
   }

   const logoutButton =()=>{
    sessionStorage.getItem('token')
    navigate("/Signin")
    alert("Logout Sucessfully")
   }

    return (
        <div className="w-screen h-[60px] bg-white flex justify-between px-7 py-4">
            <div className="flex gap-4 ">
                <img src={image} className="h-10 w-8 " />
                <h3 className="font-bold text-xl flex ">RealTimedocs</h3> 
            </div>
            <div className="flex gap-4">
                <input type="text" placeholder="Search documents..." className="rounded-md bg-gray-300 p-2 h-8 w-60 text-center"
                onChange={(e)=>{ filterdocs(e.target.value)}}/>
                <button className="h-8 w-8 rounded-full bg-blue-400 text-white text-2xl" onClick={(e)=>{handlePosition(e)}}>{name[0]}</button>
            </div>
            {isOpen && (
                <div className='bg-white absolute p-2 hover:bg-gray-200 rounded-md' style={{top:position.top , left:position.left - 30}}
                onClick={logoutButton}>Logout</div>
            )}
        </div>
    )
}


export default Navbar