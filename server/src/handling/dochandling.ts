import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { customRequest } from "../interfaces/interfaces";
import { error } from "console";
import { sendMail } from "../sendmail";

const prisma = new PrismaClient()

export const createdocument=async (req:customRequest , res:Response) => {
    const userId = req.userId

    console.log(`create document: ${req.userId}`)

    if(!userId){
        return res.status(400).json({error: "userId not founddd"})
    }

    try {
    const document = await prisma.document.create({
        data:{
            userId
        }
    })

    return res.status(200).json({message:"Document created" , document })
    } catch (error) {
        return res.status(400).json({error : "error in create doc fn"})
    }
   
}

export const allDocuments = async (req:customRequest , res:Response , next:NextFunction)=>{
    const userId = req.userId
    const filter = req.query.filter

    try {

    if(filter){
       const filteredDocuments = await prisma.document.findMany({
        where:{userId ,
            title:{
                contains:filter as string,
                mode:"insensitive"
            }
        },
        
       }) 
       return res.status(200).json({filteredDocuments})
    }
    
    const userWithDocs = await prisma.user.findUnique({
       where: { id: userId },
          include: {
          documents: true, // documents owned by user
           documentuser: {
             include: {
              document: true, // documents shared with user
              },
             },
         },
         });

      // Collect owned + shared
    const ownedDocuments = userWithDocs?.documents || [];
    const sharedDocuments = userWithDocs?.documentuser.map(d => d.document) || [];

    // Merge both
    const allDocuments = [...ownedDocuments, ...sharedDocuments];

    // (Optional) Sort by latest updated
    allDocuments.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

   // Send to frontend
   return res.status(200).json({allDocuments})

    } catch (error) {
        return res.status(400).json({error:(error as Error).message})
    }

}

export const getonedoc = async (req:customRequest , res:Response , next:NextFunction) => {
    const docId= Number(req.params.docId)
    console.log("in getonedoc backend")
    console.log(docId)
    try {
        const document =await prisma.document.findFirst({
            where:{id:docId}
        })
        return res.status(200).json({document})
    } catch (error) {
        return res.status(400).json({error:(error as Error).message})
    }
}

export const searchDocument = async (req:customRequest , res:Response , next:NextFunction) => {

    const {filter} = req.query

    const userId = req.userId

    try {
        const documents = await prisma.document.findMany({
            where:{
                userId,
                title:{
                    contains:filter as string,
                    mode:"insensitive"
                }
            }
        })

        return res.status(200).json({documents})
    } catch (error) {
        return res.status(400).json({error:(error as Error).message})
    }

}

export const deleteDocument= async (req:customRequest , res:Response , next:NextFunction)=>{
    const userId = req.userId

    const docId = Number(req.params.docId)

    if(!docId){
        return res.status(400).json({error:"Document id not recieved"})
    }

    try {
        const document = await prisma.document.findFirst({
            where:{id:docId }
        })

        if(!document){
            return res.status(400).json({error:"Document not found"})
        }

        if(document.userId !== userId){
            return res.status(400).json({error:"You are not authorized"})
        }

        await prisma.document.delete({
            where:{id:docId}
        })

        return res.status(200).json({message :"Document deleted"})

    } catch (error) {
        return res.status(400).json({error:(error as Error).message})
    }

}

export const updateDocs = async (req:Request , res:Response , next:NextFunction) => {
    const {title , content} = req.body
    const docId = Number(req.params.docId)

    console.log("Params:", req.params);
    console.log("Body:", req.body);

    try {
      const updatedDoc = await prisma.document.update({
      where: { id: docId },
      data: {
        ...(title !== null && title !== undefined ? { title } : {}),
        ...(content !== null && content !== undefined ? { content } : {}),
      },
    });

    return res.status(200).json({message:"Document updated"});

    } catch (error) {
        return res.status(400).json({error:"updating fail"})
    }
}

export const shareDocument = async(req:customRequest , res:Response , next:NextFunction)=>{
    const userId = req.userId
    const docId = Number(req.params.docId)
    const {email , permission}= req.body

    try {
        const document = await prisma.document.findFirst({
            where:{id:docId},
            select:{
                userId:true,
                user:true
            }
        })
        if(!document){return res.status(400).json({error:"Document not found"})}
        if(document?.userId != userId){
            return res.status(400).json({error:"You are not authorized"})
        }
        const user = await prisma.user.findFirst({
            where:{email:email}
        })
        if(!user){return res.status(400).json({error:"User not found"})}
        const sharedUser =await prisma.documentuser.findFirst({
            where:{
                userId:user.id,
                docId:docId
            }
        })
        if(sharedUser){
            if(permission == sharedUser.permission){
                return res.status(400).json({error:"Already shared document"})
            }
            await prisma.documentuser.update({
                where:{
                    id:sharedUser.id
                },
                data:{
                    permission: permission
                }
            })

            await sendMail({
                from: process.env.EMAIL_USER,
                to:email,
                subject:`${document?.user.name} shared a document with you with ${permission} access`,
                text:`Hi ${user.name} , You can access the document here: ${process.env.LINK}/document/${docId}`
            })
        }

        await prisma.documentuser.create({
            data:{
                docId:docId,
                userId:user.id,
                permission:permission
            }
        })

        await sendMail({
            from:process.env.EMAIL_USER,
            to:email,
            subject:`${document?.user.name} shared a document with you with ${permission} access`,
            text:`Hi ${user.name} , You can access the document here: ${process.env.LINK}/document/${docId}`
        })

        return res.status(200).json({message:"Document shared successfully"})
    } catch (error) {
        console.error(error)
        return res.status(400).json({error:"Error while sharing Document"})
    }
}