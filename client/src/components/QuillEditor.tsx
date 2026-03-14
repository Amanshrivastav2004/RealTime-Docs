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
  const socketRef = useRef<Socket | null>(null)
  const updateDocs = useStore(state=>state.updateDocs)
  const isInitialLoad = useRef<boolean>(true)

  const {docId} = useParams()  
  

  const content = useStore((state) => state.document.content)
  const permission = useStore((state) => state.document.permission)
  const setContent = useStore((state) => state.setDocument)

  const isReadOnly = permission === 'VIEW'

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

    // Set read-only mode based on permission
    quillRef.current.enable(!isReadOnly)

    const socketServer = io('http://localhost:3000')
    socketRef.current = socketServer

    socketServer.emit("join-document", docId)

    const handleChange=(delta:Delta ,oldDelta:Delta ,source:string)=>{
      if(source !== "user") return
      
      // Don't send changes if in read-only mode
      if(isReadOnly) return

      const currentContent = quillRef.current?.getText() || '';

      socketServer.emit("send-change", { docId, delta })
      socketServer.emit("doc_change", { docId, content: currentContent });

      dataTobackend();
    }
// for sending text
    quillRef.current.on("text-change",handleChange)

    const receiveChange=(delta:Delta)=>{
      console.log("[QuillEditor] Received delta from server:", JSON.stringify(delta));
      if (quillRef.current) {
        try {
          quillRef.current.updateContents(delta, 'api'); // Use 'api' source to prevent triggering text-change
          console.log("[QuillEditor] Successfully applied delta to editor");
        } catch (error) {
          console.error("[QuillEditor] Error applying delta:", error);
        }
      } else {
        console.warn("[QuillEditor] Cannot apply delta - quillRef is null");
      }
    }

    const handleAIUpdate = (data: { docId: string; delta: Delta }) => {
      console.log("[QuillEditor] Received AI update:", JSON.stringify(data));
      if (quillRef.current && data.docId === docId) {
        try {
          quillRef.current.updateContents(data.delta, 'api');
          console.log("[QuillEditor] Successfully applied AI delta to editor");
        } catch (error) {
          console.error("[QuillEditor] Error applying AI delta:", error);
        }
      } else {
        console.warn("[QuillEditor] Cannot apply AI delta - quillRef:", !!quillRef.current, "docId match:", data.docId === docId);
      }
    }

    socketServer.on("receive-change" , receiveChange)
    socketServer.on("ai-update", handleAIUpdate)
    
    console.log("[QuillEditor] Socket listeners registered for document:", docId);

    return () => {
      console.log("Cleanup");
      if (quillRef.current) {
        quillRef.current.off("text-change",handleChange)
      }
     socketServer.off("receive-change", receiveChange);
     socketServer.off("ai-update", handleAIUpdate);
     socketServer.disconnect();
     socketRef.current = null;
    }
  },[docId, isReadOnly])

   useEffect(() => {
      // Only load content on initial mount, not on subsequent updates
      if (quillRef.current && content && isInitialLoad.current) {
        // Check if content is Quill Delta JSON or HTML
        if (content.trim().startsWith('{')) {
          try {
            // Parse and load Delta JSON
            const delta = JSON.parse(content);
            quillRef.current.setContents(delta);
          } catch (e) {
            // If parsing fails, treat as HTML
            console.warn('Failed to parse content as Delta JSON, treating as HTML');
            quillRef.current.clipboard.dangerouslyPasteHTML(content);
          }
        } else {
          // Load as HTML
          quillRef.current.clipboard.dangerouslyPasteHTML(content);
        }
        
        // Emit doc_open after content is loaded
        if (socketRef.current) {
          const plainTextContent = quillRef.current.getText() || '';
          socketRef.current.emit("doc_open", { docId, content: plainTextContent });
        }
        
        isInitialLoad.current = false;
      }
    },[content, docId])
  
  return (
    <div>
      {isReadOnly && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 mb-2">
          <p className="font-bold">View Only</p>
          <p className="text-sm">You have view-only access to this document.</p>
        </div>
      )}
      <div ref={divRef}  className='min-h-screen'></div>
    </div>
  )
}

export default QuillEditor