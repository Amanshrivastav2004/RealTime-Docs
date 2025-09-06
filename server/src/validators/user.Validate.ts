import { error } from 'console'

import { z, ZodTypeAny } from 'zod'

export const signupSchema = z.object({
    name: z.string().trim().min(3 ,{message : "Name at least 3 characters"} ),
    email:z.string().trim().email({message: "Please give valid email"}),
    password:z.string().trim().min(6 , { message: "Password atleast 6 characters"})
})

export const signinschema = z.object({
    email:z.string().trim().email({message: "Please give valid email"}),
    password:z.string().trim().min(6 , { message: "Password atleast 6 characters"})
})

export const resetschema =z.object({
    email:z.string().trim().email({message: "Please give valid email"})
})

export const resetpasswordschema = z.object({
    password:z.string().trim().min(6 , { message: "Password atleast 6 characters"}),
    confirmpassword:z.string().trim().min(6 , { message: "Password atleast 6 characters"})
})


export const userValidator=(body: object , schema:ZodTypeAny )=>{
    const result = schema.safeParse(body)
    
    if(!(result.success)){
        
        return result.error.errors[0].message
    }

    else{
        return true
    }
   
}

