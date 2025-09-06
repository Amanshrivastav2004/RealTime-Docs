import { Request } from "express"
export interface customRequest extends Request{
    userEmail?:string
    userId?:number
}
