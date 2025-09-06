import express from 'express'
import user from './userRouter'
import docRouter from './docRouter'

const router = express.Router()

router.use("/user" , user)

router.use("/document" , docRouter)


export default router