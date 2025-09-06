import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken'
import { customRequest } from "../interfaces/interfaces";


export const userAuthorization = (req:customRequest , res:Response , next:NextFunction)=>{

    const acessToken = req.headers.authorization
    
    if(!acessToken){
        return res.status(401).json({error:"Acess token missing"})
    }

    try {
        const decoded  = jwt.verify(acessToken , process.env.JWT_KEY as string)

        req.userEmail = (decoded as JwtPayload).email
        
        req.userId = (decoded as JwtPayload).userId 
        
        
        next()
    } catch (error) {
        return res.status(401).json({error:(error as Error).message})
    }
}