import express from 'express'
import { documentSchema, docValidator, sharedocSchema } from '../validators/document.validate';
import { allDocuments, createdocument, deleteDocument, getonedoc, searchDocument, shareDocument, updateDocs} from '../handling/dochandling';
import { userAuthorization } from '../middleware/authorization';
const docRouter =express.Router()


docRouter.post("/" ,  userAuthorization , createdocument )
docRouter.get("/" , userAuthorization , allDocuments)
docRouter.get("/:docId" , userAuthorization , getonedoc)
// docRouter.get("/search" , userAuthorization , searchDocument)
docRouter.delete("/delete/:docId" , userAuthorization , deleteDocument)
docRouter.put("/update/:docId" ,docValidator(documentSchema) , userAuthorization , updateDocs)
docRouter.post("/share/:docId" , docValidator(sharedocSchema) , userAuthorization , shareDocument)



export default docRouter;