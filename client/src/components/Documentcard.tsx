import axios from 'axios';
import image from '../assets/logo.png'
import React, {  useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/zustand';


interface delDocresonse{
    message:string
}

const Documentcard = ()=>{

    const [position , setPosition] = useState({top:0 , left:0})
    const [openMenuDocId, setOpenMenuDocId] = useState<number | null>(null);
    const navigate = useNavigate()

    const getDocuments = useStore(state => state.getDocuments)
    
    const documents = useStore((state)=> state.documents) || []

    useEffect(()=>{
        
        getDocuments()
    }, [])

    

    const handlePosition = (e:React.MouseEvent )=>{
        
            const rect = e.currentTarget.getBoundingClientRect()
            setPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX
            })
        
    }

    function stripHtml(html:string){
        const tempdiv = document.createElement("div")
        tempdiv.innerHTML = html
        return tempdiv.innerText
    }

    return (
        <div className="flex flex-wrap gap-8">
            {documents.map(doc=>(
            <div className="h-[250px] w-[150px] bg-white flex flex-col" key={doc.id}
            onClick={()=>{
            navigate(`/document/${doc.id}`) 
            }}>
                <div className="grow bg-gray-200 border-b border-b-gray-300">
                     <p className='text-[3px] overflow-auto'>{stripHtml(doc.content || "" )}</p>
                </div>
                <div className="flex flex-col  h-[60px] gap-1 ">
                    <div className='text-sm m-2 h-[10px]'>{doc.title || "Untitled Document"}</div>
                    <div className='flex justify-between gap-2 '>
                        <img src={image} className="h-6 m-1" />
                        <div className='text-sm m-1'>5-6-2024</div>
                        <svg xmlns="http://www.w3.org/2000/svg"  fill="currentColor" className="bi bi-three-dots-vertical h-7 w-4 text-gray-500" viewBox="0 0 16 16"
                             onClick={ (e)=>{
                                e.stopPropagation();
                                e.preventDefault();
                                setOpenMenuDocId(doc.id); 
                                handlePosition(e)}}>
                           <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
                        </svg>
                        {openMenuDocId === doc.id &&(
                         <div className='absolute bg-white' style={{top:position.top , left:position.left}}>
                           <div className='border-b border-b-gray-300 hover:bg-gray-200 p-1 text-sm' onClick={
                            async (e) => {
                                try {
                                    setOpenMenuDocId(null);
                                    e.stopPropagation(); 
                                    const response = await axios.delete<delDocresonse>(`${import.meta.env.VITE_URL}/api/v1/document/delete/${doc.id}` , {
                                        headers:{
                                            authorization:sessionStorage.getItem('token')
                                        }
                                    })
                                    getDocuments()
                                    alert(response.data.message)
                                } catch (error:any) {
                                    alert(error.response.data.error)
                                }
                            }
                           } >Delete</div>
                           <div className='hover:bg-gray-200 p-1 text-sm'>Share</div> 
                         </div>
                          )
                        }
                    </div>
                </div>
            </div>
            ))}
            
        </div>
    )

}


export default Documentcard