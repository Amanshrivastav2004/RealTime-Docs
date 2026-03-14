
import  QuillEditor  from '../components/QuillEditor';
import DocumentChat from '../components/DocumentChat';
import { useEffect, useState } from 'react';
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
    permission:string
}

const Document = ()=>{
  
  const token = sessionStorage.getItem("token") as string
  const {docId} = useParams()
  const setDocument = useStore(state=>state.setDocument)
  const [showChat, setShowChat] = useState(false)


  useEffect(()=>{
    const response = async () => {
      
      try {
        const res = await axios.get<getonedoc>(`${import.meta.env.VITE_URL}/api/v1/document/${docId}`,{
        headers:{
          authorization:token
        }
      })
      
      setDocument({
        title:res.data.document.title || "" , 
        content:res.data.document.content || "",
        permission:res.data.permission || "EDIT"
      })
      
      } catch (error) {
        console.error("Error fetching doc:", error);
      }
    }
    response()

    return ()=>{
      setDocument({title: "" , content: "", permission:"EDIT"})
    }
  },[])
    
 

    return (
    <div className="flex flex-col h-screen w-screen">
      <DocumentNavbar/>
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Section */}
        <div className="flex-1 overflow-y-auto mx-10 sm:mx-20 md:mx-30 lg:mx-40 xl:mx-60 2xl:mx-80 border border-gray-400 bg-white shadow-2xl">
          <QuillEditor />
        </div>
        
        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-96 flex-shrink-0">
            <DocumentChat />
          </div>
        )}
      </div>

      {/* Floating Chat Toggle Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center z-50"
        title={showChat ? "Close Chat" : "Open Chat"}
      >
        {showChat ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </div>
    )
}

export default Document