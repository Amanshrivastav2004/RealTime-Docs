import express from 'express'
import user from './userRouter'
import docRouter from './docRouter'
import airouter from './ai'

const router = express.Router()

router.use("/user" , user)

router.use("/document" , docRouter)

router.use("/ai" , airouter)


export default router