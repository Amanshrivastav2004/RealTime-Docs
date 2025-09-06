import { Server } from "socket.io";
import app from "./index"
import http from 'http'



const server = http.createServer(app)

const io = new Server(server , {
    cors:{
        origin:'*',
        methods:'*'
    }
})

io.on("connection" , (socket)=>{

    console.log("User connected", socket.id)

    // User joins a specific document room
    socket.on("join-document", (docId) => {
    socket.join(docId)
      console.log(`User ${socket.id} joined document ${docId}`)
     })

    socket.on("send-change", ({ docId, delta }) => {
      socket.to(docId).emit("receive-change", delta)
    })

    socket.on("disconnect", () => {
      console.log("User disconnected", socket.id)
     })
})

server.listen(3000 , ()=>{
    console.log('server is running at port 3000')
})