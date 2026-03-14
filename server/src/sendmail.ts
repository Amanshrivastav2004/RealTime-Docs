

import sgMail, { MailDataRequired } from '@sendgrid/mail';

// Only set API key if it exists to avoid warnings
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export const SendMail = async (mailData: MailDataRequired) => {
    try {
        const response = await sgMail.send(mailData);
        return response;
    } catch (error) {
        throw error;
    }
};