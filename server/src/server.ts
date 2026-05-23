import { Server } from "socket.io";
import app from "./index"
import http from 'http'
import { PrismaClient } from "@prisma/client";
import { createVectorStore } from "./rag/createVectorStore";
import { initVectorStore } from "./rag/initVectorStore";
import { setSocketIO } from "./rag/applyDelta";

const prisma = new PrismaClient()

const server = http.createServer(app)

const io = new Server(server , {
    cors:{
        origin:'*',
        methods:'*'
    }
})

// Set Socket.IO instance for applyDelta to use
setSocketIO(io);


const debounceTimers: Map<string, NodeJS.Timeout> = new Map();

// Track active users per document
const activeUsers: Map<string, Set<{ userId: number; name: string; socketId: string }>> = new Map();

export function handleDocChange(docId: string, content: string) {
  // clear existing timer
  if (debounceTimers.has(docId)) {
    clearTimeout(debounceTimers.get(docId)!);
  }

  // create new debounce timer
  const timer = setTimeout(async () => {
    console.log(`Embedding document ${docId}`);
    await createVectorStore(docId, content);
    debounceTimers.delete(docId);
  }, 2000); // 2 seconds pause

  debounceTimers.set(docId, timer);
}


io.on("connection" , (socket)=>{

    console.log("User connected", socket.id)

    // User joins a specific document room
    socket.on("join-document", (docId) => {
      socket.join(`document-${docId}`)
      console.log(`User ${socket.id} joined document ${docId}`)
    })

    // User announces their presence
    socket.on("user-joined", ({ docId, userId, name }) => {
      const key = `document-${docId}`;
      if (!activeUsers.has(key)) {
        activeUsers.set(key, new Set());
      }
      
      const users = activeUsers.get(key)!;
      users.add({ userId, name, socketId: socket.id });
      
      // Broadcast updated user list to all users in the room
      const userList = Array.from(users);
      io.to(key).emit('active-users', userList);
      
      console.log(`User ${name} (${userId}) joined document ${docId}. Active users:`, userList.length);
    })

    // User leaves a document
    socket.on("user-left", ({ docId, userId }) => {
      const key = `document-${docId}`;
      const users = activeUsers.get(key);
      
      if (users) {
        const userArray = Array.from(users);
        const updatedUsers = userArray.filter(u => u.socketId !== socket.id);
        activeUsers.set(key, new Set(updatedUsers));
        
        // Broadcast updated user list
        io.to(key).emit('active-users', updatedUsers);
        
        console.log(`User ${userId} left document ${docId}. Remaining users:`, updatedUsers.length);
      }
    })

    // Title update broadcast
    socket.on("title-change", ({ docId, title }) => {
      // Broadcast title change to other users
      socket.to(`document-${docId}`).emit('title-updated', title);
      console.log(`Title updated for document ${docId}: ${title}`);
    })

    socket.on("doc_open", async ({ docId , content }) => {
      console.log(`doc_open received for docId: ${docId}, content length: ${content?.length || 0}`);
      await initVectorStore(docId, content);
      });

    socket.on("doc_change", ({ docId, content }) => {
      handleDocChange(docId, content);
    });

    socket.on("send-change", async ({ docId, delta }) => {
      // Broadcast the change to other users in the same document
      socket.to(`document-${docId}`).emit("receive-change", delta)
    })

    socket.on("disconnect", () => {
      console.log("User disconnected", socket.id)
      
      // Remove user from all document rooms
      activeUsers.forEach((users, key) => {
        const userArray = Array.from(users);
        const updatedUsers = userArray.filter(u => u.socketId !== socket.id);
        
        if (updatedUsers.length !== userArray.length) {
          activeUsers.set(key, new Set(updatedUsers));
          io.to(key).emit('active-users', updatedUsers);
        }
      });
    })
})

const PORT = process.env.PORT || 3000;

server.listen(PORT, ()=>{
    console.log(`server is running at port ${PORT}`)
})