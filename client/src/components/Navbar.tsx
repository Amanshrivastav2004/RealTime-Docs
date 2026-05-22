import { useEffect, useRef, useState } from 'react'
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
    const logoutRef = useRef<HTMLDivElement>(null)
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
    const { setDocuments } = useStore()
    const getDocuments = useStore(state => state.getDocuments)

    const navigate = useNavigate()

    // Close logout menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
                setisopen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

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
    sessionStorage.removeItem('token')
    navigate("/Signin")
    alert("Logout Successfully")
   }

    return (
        <div className="w-full h-[64px] bg-white border-b border-gray-100 flex justify-between items-center px-4 md:px-7 py-3 shadow-2xs">
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0 cursor-pointer" onClick={() => navigate("/")}>
                <img src={image} className="h-8 w-6 md:h-10 md:w-8 flex-shrink-0" alt="Logo" />
                <h3 className="font-bold text-base md:text-xl text-gray-800">RealTimedocs</h3> 
            </div>
            
            <div className="flex items-center gap-3 md:gap-6 flex-1 justify-end">
                {/* Search Bar */}
                <div className="relative w-full max-w-[150px] sm:max-w-xs md:max-w-sm">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input 
                        type="text" 
                        placeholder="Search documents..." 
                        className="w-full bg-gray-50 border border-gray-200 rounded-full py-1.5 pl-9 pr-4 text-xs md:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-3xs"
                        onChange={(e)=>{ filterdocs(e.target.value)}}
                    />
                </div>

                {/* Profile Avatar Button with Dropdown Container */}
                <div className="relative" ref={logoutRef}>
                    <button 
                        onClick={() => setisopen(!isOpen)}
                        className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center font-bold text-sm md:text-base border-2 border-white cursor-pointer select-none"
                        title="User Account"
                    >
                        {name ? name[0].toUpperCase() : 'U'}
                    </button>

                    {/* Premium Profile Dropdown */}
                    {isOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-150 rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="px-4 py-2.5 border-b border-gray-100">
                                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Logged in as</p>
                                <p className="text-xs md:text-sm font-bold text-gray-700 truncate mt-0.5">{name || "User"}</p>
                            </div>
                            <button 
                                onClick={logoutButton}
                                className="w-full text-left px-4 py-2 text-xs md:text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Navbar