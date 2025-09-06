import express from 'express'
import cors from 'cors'
import router from './Routes/router'
import {config} from 'dotenv'
const app = express()

config()

app.use(cors())


app.use(express.json())

app.use("/api/v1" , router)

// app.listen(3000 , ()=>{
//     console.log("Server is running at 3000 port")
// })

export default app;