
import  QuillEditor  from '../components/QuillEditor';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/zustand';
import axios from "axios"
import DocumentNavbar from '../components/DocumentNavbar';



interface Document{
    id:number
    title?:string
    content?:string
    updatedAt:string
    userId:number
}

interface getonedoc{
    document:Document
}

const Document = ()=>{
  
  const token = sessionStorage.getItem("token") as string
  const {docId} = useParams()
  const setDocument = useStore(state=>state.setDocument)


  useEffect(()=>{
    const response = async () => {
      
      try {
        const res = await axios.get<getonedoc>(`${import.meta.env.VITE_URL}/api/v1/document/${docId}`,{
        headers:{
          authorization:token
        }
      })
      
      setDocument({title:res.data.document.title || "" , content:res.data.document.content || ""})
      
      } catch (error) {
        console.error("Error fetching doc:", error);
      }
    }
    response()

    return ()=>{
      setDocument({title: "" , content: ""})
    }
  },[])
    
 

    return (
    <div className="flex flex-col h-screen w-screen">
      <DocumentNavbar/>
      <div className="grow mx-10 sm:mx-20 md:mx-30 lg:mx-40 xl:mx-60 2xl:mx-80 border border-gray-400 bg-white shadow-2xl" >
      <QuillEditor></QuillEditor>
      </div>
    </div>
    )
}

export default Document