import axios from 'axios';

export interface MailData {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export const SendMail = async (mailData: MailData) => {
  try {
    const response = await axios.post(
      'https://api.mailjet.com/v3.1/send',
      {
        Messages: [
          {
            From: {
              Email: process.env.EMAIL_USER,
              Name: 'RealTimeDocs',
            },
            To: [
              {
                Email: mailData.to,
              },
            ],
            Subject: mailData.subject,
            HTMLPart: mailData.html,
            TextPart: mailData.text,
          },
        ],
      },
      {
        auth: {
          username: process.env.MAILJET_API_KEY as string,
          password: process.env.MAILJET_SECRET_KEY as string,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('[SendMail] Email sent successfully via Mailjet:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[SendMail] Error sending email via Mailjet:', error?.response?.data || error.message);
    throw error;
  }
};