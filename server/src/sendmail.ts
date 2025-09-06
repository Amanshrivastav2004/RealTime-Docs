import nodemailer, { SendMailOptions } from 'nodemailer'
import Mail from 'nodemailer/lib/mailer'

const transpoter = nodemailer.createTransport({
    port:465,
    service:'gmail',
    auth:{
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    } , 
    secure: true
})

export const sendMail = async (mailoptions: SendMailOptions)=>{

    try {
        console.log("EMAIL_USER:", process.env.EMAIL_USER)
        console.log("EMAIL_PASSWORD:", process.env.EMAIL_PASSWORD?.length)
        console.log("PASS length:", process.env.EMAIL_PASSWORD?.length);
        console.log("PASS raw:", JSON.stringify(process.env.EMAIL_PASSWORD));
        const info = await transpoter.sendMail(mailoptions)
        return info
    } catch (error) {
        throw error
    }
} 