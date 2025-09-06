import express from 'express'
import { SigninAuthentication, SignupAuthentication } from '../middleware/authentication'
import { getUser, resetpassword, signin, signup, validateEmail, verifyEmail, verifyresetToken } from '../handling/userHandling'
import { userAuthorization } from '../middleware/authorization'
const user = express.Router()


user.post("/signup" , SignupAuthentication , signup)
user.put("/verify/:verificationtoken" , verifyEmail)
user.post("/signin", SigninAuthentication , signin)
user.post("/forgot-password" , validateEmail )
user.get("/reset-password/:resetToken" , verifyresetToken )
user.put("/reset-password" , resetpassword)
user.get("/" ,userAuthorization , getUser )

export default user
