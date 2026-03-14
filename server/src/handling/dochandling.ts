import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { customRequest } from "../interfaces/interfaces";
import { error } from "console";
import { SendMail } from "../sendmail";

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

export const allDocuments = async (req:customRequest , res:Response )=>{
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
    const sharedDocuments = userWithDocs?.documentuser.map((d: any) => d.document) || [];
    const Documents = [...ownedDocuments, ...sharedDocuments];

    // Merge both
    const allDocuments = { ownedDocuments , sharedDocuments , Documents}
    

   // Send to frontend
   return res.status(200).json({allDocuments})

    } catch (error) {
        return res.status(400).json({error:(error as Error).message})
    }

}

export const getonedoc = async (req:customRequest , res:Response ) => {
    const docId= Number(req.params.docId)
    const userId = req.userId
    console.log("in getonedoc backend")
    console.log(docId)
    try {
        const document =await prisma.document.findFirst({
            where:{id:docId}
        })
        
        if(!document){
            return res.status(404).json({error:"Document not found"})
        }

        // Check if user is owner or has shared access
        let permission = 'EDIT'; // Default for owner
        if(document.userId !== userId){
            // Check if document is shared with this user
            const sharedAccess = await prisma.documentuser.findFirst({
                where:{
                    userId: userId,
                    docId: docId
                }
            })
            if(!sharedAccess){
                return res.status(403).json({error:"You don't have access to this document"})
            }
            permission = sharedAccess.permission
        }

        return res.status(200).json({document, permission})
    } catch (error) {
        return res.status(400).json({error:(error as Error).message})
    }
}

export const searchDocument = async (req:customRequest , res:Response ) => {

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

export const deleteDocument= async (req:customRequest , res:Response )=>{
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

export const updateDocs = async (req:customRequest , res:Response ) => {
    const {title , content} = req.body
    const docId = Number(req.params.docId)
    const userId = req.userId

    console.log("Params:", req.params);
    console.log("Body:", req.body);

    try {
      const document = await prisma.document.findFirst({
          where:{id:docId}
      })

      if(!document){
          return res.status(404).json({error:"Document not found"})
      }

      // Check if user has edit permission
      if(document.userId !== userId){
          // Check if user has shared access with EDIT permission
          const sharedAccess = await prisma.documentuser.findFirst({
              where:{
                  userId: userId,
                  docId: docId,
                  permission: 'EDIT'
              }
          })
          if(!sharedAccess){
              return res.status(403).json({error:"You don't have edit permission for this document"})
          }
      }

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

export const shareDocument = async(req:customRequest , res:Response )=>{
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

            await SendMail({
                from: process.env.EMAIL_USER as string,
                to:email,
                subject:`${document?.user.name} shared a document with you with ${permission} access`,
                text:`Hi ${user.name} , You can access the document here: ${process.env.LINK}/document/${docId}`
            })

            return res.status(200).json({message:"Document permission updated successfully"})
        }

        await prisma.documentuser.create({
            data:{
                docId:docId,
                userId:user.id,
                permission:permission
            }
        })

        await SendMail({
            from:process.env.EMAIL_USER as string,
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

export const getCollaborators = async (req: customRequest, res: Response) => {
    const userId = req.userId
    const docId = Number(req.params.docId)

    try {
        const document = await prisma.document.findFirst({
            where: { id: docId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                documentuser: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            }
        })

        if (!document) {
            return res.status(404).json({ error: "Document not found" })
        }

        const isOwner = document.userId === userId

        if (!isOwner) {
            const hasAccess = document.documentuser.some((entry) => entry.userId === userId)
            if (!hasAccess) {
                return res.status(403).json({ error: "You don't have access to this document" })
            }
        }

        const collaborators = document.documentuser.map((entry) => ({
            id: entry.id,
            userId: entry.user.id,
            name: entry.user.name,
            email: entry.user.email,
            permission: entry.permission
        }))

        return res.status(200).json({
            owner: {
                userId: document.user.id,
                name: document.user.name,
                email: document.user.email,
                permission: "OWNER"
            },
            collaborators,
            canShare: isOwner
        })
    } catch (error) {
        console.error(error)
        return res.status(400).json({ error: "Error while fetching collaborators" })
    }
}

export const removeCollaborator = async (req: customRequest, res: Response) => {
    const userId = req.userId
    const docId = Number(req.params.docId)
    const collaboratorId = Number(req.params.collaboratorId)

    try {
        const document = await prisma.document.findFirst({
            where: { id: docId }
        })

        if (!document) {
            return res.status(404).json({ error: "Document not found" })
        }

        if (document.userId !== userId) {
            return res.status(403).json({ error: "Only document owner can remove collaborators" })
        }

        const documentUser = await prisma.documentuser.findFirst({
            where: {
                id: collaboratorId,
                docId: docId
            }
        })

        if (!documentUser) {
            return res.status(404).json({ error: "Collaborator not found" })
        }

        await prisma.documentuser.delete({
            where: { id: collaboratorId }
        })

        return res.status(200).json({ message: "Collaborator removed successfully" })
    } catch (error) {
        console.error(error)
        return res.status(400).json({ error: "Error while removing collaborator" })
    }
}

export const updateCollaboratorPermission = async (req: customRequest, res: Response) => {
    const userId = req.userId
    const docId = Number(req.params.docId)
    const collaboratorId = Number(req.params.collaboratorId)
    const { permission } = req.body

    try {
        const document = await prisma.document.findFirst({
            where: { id: docId }
        })

        if (!document) {
            return res.status(404).json({ error: "Document not found" })
        }

        if (document.userId !== userId) {
            return res.status(403).json({ error: "Only document owner can change permissions" })
        }

        const documentUser = await prisma.documentuser.findFirst({
            where: {
                id: collaboratorId,
                docId: docId
            }
        })

        if (!documentUser) {
            return res.status(404).json({ error: "Collaborator not found" })
        }

        await prisma.documentuser.update({
            where: { id: collaboratorId },
            data: { permission }
        })

        return res.status(200).json({ message: "Permission updated successfully" })
    } catch (error) {
        console.error(error)
        return res.status(400).json({ error: "Error while updating permission" })
    }
}