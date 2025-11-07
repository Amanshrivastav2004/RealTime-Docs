import axios from 'axios';
import { useNavigate } from "react-router-dom";
import Documentcard from "./Documentcard";
import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/zustand';

interface Document{
    id:number
    title?:string
    content?:string
    updatedAt:string
    userId:number
}

interface createdocresponse{
    message:string
    document:Document
}

export  const  Body = ()=>{

    const filterOption = useStore((state) => state.filterOption);
    const setFilterOption = useStore((state) => state.setfilterOption);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const getDocuments = useStore((state) => state.getDocuments)

    // const documents = useStore((state)=> state.documents)
    
    // useEffect(()=>{
       
    //         getDocuments()
    //     },[])
    // useLayoutEffect(()=>{
            
    //         getDocuments()
    //     }, [])
    
    
     const navigate = useNavigate()
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    

    const createdocument = async () => {
        const token = sessionStorage.getItem("token")

        if (!token) {
            alert("User is not authenticated")
        }

        try {
        const response = await axios.post<createdocresponse>(`${import.meta.env.VITE_URL}/api/v1/document/`, {} , {
        headers:{
            authorization:sessionStorage.getItem('token')
            }
        } )
        
        alert(response.data.message)
        
        // getDocuments()
        navigate(`/document/${response.data.document.id}`)
        } catch (error:any) {
            console.log(error?.response?.data); 
            alert(error?.response?.data?.error);
        }
   
    }


    const getFilterLabel = () => {
        switch(filterOption) {
            case 'anyone': return 'Owned by anyone';
            case 'me': return 'Owned by me';
            case 'notMe': return 'Not owned by me';
        }
    };

    return (
        <div className="flex flex-col gap-6 px-10 md:px-20 lg:px-32 xl:px-40 py-20">
                <div className="h-[200px] w-full">
                    <button onClick={createdocument} className="h-full w-[150px] flex flex-col justify-center items-center bg-white shadow-2xl">
                        <div className="text-9xl font-extralight text-blue-500">+</div>
                        <p>Blank Document</p>
                    </button>
                </div>
                
                <div className="flex items-center gap-4">
                    <p className="font-bold text-lg">Recent Documents</p>
                    
                    <div className="relative" ref={dropdownRef}>
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-gray-700 min-w-[220px] justify-between"
                        >
                            <span>{getFilterLabel()}</span>
                            <svg 
                                className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute top-full mt-2 w-full min-w-[220px] bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10">
                                <button
                                    onClick={() => {
                                        setFilterOption('anyone');
                                        setIsDropdownOpen(false);
                                        getDocuments();
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                                >
                                    {filterOption === 'anyone' && <span>✓</span>}
                                    <span className={filterOption !== 'anyone' ? 'ml-6' : ''}>Owned by anyone</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setFilterOption('me');
                                        setIsDropdownOpen(false);
                                        getDocuments();
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                                >
                                    {filterOption === 'me' && <span>✓</span>}
                                    <span className={filterOption !== 'me' ? 'ml-6' : ''}>Owned by me</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setFilterOption('notMe');
                                        setIsDropdownOpen(false);
                                        getDocuments();
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                                >
                                    {filterOption === 'notMe' && <span>✓</span>}
                                    <span className={filterOption !== 'notMe' ? 'ml-6' : ''}>Not owned by me</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                <Documentcard ></Documentcard>
                   
            </div>
    )
}