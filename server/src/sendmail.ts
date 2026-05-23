

import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  return transporter;
};

export interface MailData {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export const SendMail = async (mailData: MailData) => {
  try {
    const activeTransporter = getTransporter();
    const response = await activeTransporter.sendMail(mailData);
    return response;
  } catch (error) {
    throw error;
  }
};