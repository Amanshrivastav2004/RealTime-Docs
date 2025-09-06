// src/components/QuillEditor.tsx
import React, { useRef, useEffect, useState } from 'react';
import Quill, { Delta } from 'quill'
import 'quill/dist/quill.snow.css'; 
import { useStore } from '../store/zustand';
import { useParams } from 'react-router-dom';
import axios from 'axios'
import { io, Socket } from 'socket.io-client'

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


const toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
  ['blockquote', 'code-block'],
  ['link', 'image', 'video', 'formula'],

  [{ 'header': 1 }, { 'header': 2 }],               // custom button values
  [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
  [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
  [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
  [{ 'direction': 'rtl' }],                         // text direction

  [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

  [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
  [{ 'font': [] }],
  [{ 'align': [] }],

  ['clean']                                         // remove formatting button
];




const QuillEditor = () => {
  const divRef = useRef<HTMLDivElement | null>(null)
  const quillRef = useRef<Quill | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const updateDocs = useStore(state=>state.updateDocs)

  const {docId} = useParams()  
  

  const content = useStore((state) => state.document.content)
  const setContent = useStore((state) => state.setDocument)

  const dataTobackend = () => {
    
    if (debounce.current) clearTimeout(debounce.current)
    try {
      debounce.current = setTimeout(() => {
        (async () => {
        const html = quillRef.current?.root.innerHTML 
        // setContent({content:html})
        updateDocs(Number(docId), { content:html })
        })()
      },1000)
    } catch (error) {
      console.error(error)
      alert("error while sending data to backend")
    }
  }

  
  useEffect(() => {
    console.log("Mount");
    if (!divRef.current) return
    if (!quillRef.current) {
      quillRef.current = new Quill(divRef.current,{theme: "snow",modules: {toolbar: toolbarOptions}})
    }

    const socketServer = io('http://localhost:3000')

    socketServer.emit("join-document", docId)

    const handleChange=(delta:Delta ,oldDelta:Delta ,source:string)=>{
      if(source !== "user") return
      socketServer.emit("send-change", { docId, delta })

      dataTobackend();
    }
// for sending text
    quillRef.current.on("text-change",handleChange)

    const receiveChange=(delta:Delta)=>{
      quillRef.current!.updateContents(delta)
    }

    socketServer.on("receive-change" , receiveChange)

    return () => {
      console.log("Cleanup");
      if (quillRef.current) {
        quillRef.current.off("text-change",handleChange)
      }
     socketServer.off("receive-change", receiveChange);
     socketServer.disconnect();
    }
  },[docId])

useEffect(() => {
      if (quillRef.current && quillRef.current.root.innerHTML !== content) {
        quillRef.current.clipboard.dangerouslyPasteHTML(content)
      }
  },[content])
  
  return (
    <div ref={divRef}  className='min-h-screen'></div>
  )
}

export default QuillEditor