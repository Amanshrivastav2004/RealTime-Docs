import  { create } from 'zustand'
import axios from 'axios';

interface Document{
    id:number
    title?:string
    content?:string
    updatedAt:string
    userId:number
}

interface Response{
        message:string
    }

interface Documentt{
    title:string
    content:string
}

interface getdocresponse{
    allDocuments: {
        ownedDocuments: Document[]
        sharedDocuments: Document[]
        Documents: Document[]
    }
}

interface StoreState{
    documents:Document[]
    getDocuments:()=> Promise<void>;
    setDocuments:(docs:Document[])=> void
    // title:string
    // setTitle:(titlee:string)=> void
    // content:string
    // setContent:(contentt:string)=>void
    document:Documentt
    setDocument:(data:{title?:string , content?:string})=>void
    updateDocs:(docId:number , document:{title?:string , content?:string})=> Promise<void>;
    filterOption:string
    setfilterOption:(option:string)=> void
}

export const useStore = create<StoreState>((set , get)=>({
    documents:[] , 
    getDocuments: async () => {
        try {
            console.log("Fetching documents...");
            const response = await axios.get<getdocresponse>(`${import.meta.env.VITE_URL}/api/v1/document/`,{
                headers:{
                authorization: sessionStorage.getItem('token')
                }
            })
            const filterOption = get().filterOption;
            if (filterOption === 'me') {
                const filteredDocs = response.data.allDocuments.ownedDocuments
                set({documents: filteredDocs});
            } else if (filterOption === 'notMe') {
                const filteredDocs = response.data.allDocuments.sharedDocuments
                set({documents: filteredDocs});
            } else {    
            set({documents: response.data.allDocuments.Documents})
            console.log("Documents fetched:", response.data.allDocuments.Documents);
            }
        } catch (error) {
            console.error("Error fetching:" , error)
        }
    } ,
    setDocuments:(docs)=> set({documents:docs}),
    // title:"",
    // setTitle:(titlee)=>set({title:titlee}),
    // content:"",
    // setContent:(contentt)=>set({content:contentt}),
    document:{
        title:"",
        content:""
    },
    setDocument:(data)=>set((state)=>({document: {
      ...state.document,
      ...data
    },})),
    updateDocs: async (docId , document) => {
        const res = await axios.put<Response>(`${import.meta.env.VITE_URL}/api/v1/document/update/${docId}`,{
            title:document.title ,
            content:document.content 
        } , {
            headers:{
                authorization:sessionStorage.getItem('token')
            }
        })
       console.log(res.data.message)
    },
    filterOption:'me',
    setfilterOption:(option:string)=> set({filterOption:option})
}))