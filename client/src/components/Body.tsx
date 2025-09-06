import axios from 'axios';
import { useNavigate } from "react-router-dom";
import Documentcard from "./Documentcard";
// import { useEffect } from 'react';
// import { useStore } from '../store/zustand';

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

    
    // const getDocuments = useStore((state) => state.getDocuments)

    // const documents = useStore((state)=> state.documents)
    
    // useEffect(()=>{
       
    //         getDocuments()
    //     },[])
    
     const navigate = useNavigate()
    

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


    return (
        <div className="flex flex-col gap-6 px-10 md:px-20 lg:px-32 xl:px-40 py-20">
                <div className="h-[200px] w-full">
                    <button onClick={createdocument} className="h-full w-[150px] flex flex-col justify-center items-center bg-white shadow-2xl">
                        <div className="text-9xl font-extralight text-blue-500">+</div>
                        <p>Blank Document</p>
                    </button>
                </div>
                <p className="font-bold text-lg">Recent Documents</p>
                
                <Documentcard ></Documentcard>
                   
            </div>
    )
}