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
      'https://api.resend.com/emails',
      {
        from: 'onboarding@resend.dev',
        to: [mailData.to],
        subject: mailData.subject,
        html: mailData.html || `<p>${mailData.text}</p>`,
        text: mailData.text,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('[SendMail] Email sent successfully via Resend:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[SendMail] Error sending email via Resend:', error?.response?.data || error.message);
    throw error;
  }
};