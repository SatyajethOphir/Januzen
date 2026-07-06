import * as brevo from "@getbrevo/brevo";

// Singleton Brevo client
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || "");

interface EmailOptions {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachment?: { name: string; content: string; contentType: string }[];
}

export const EmailService = {
  async sendEmail(options: EmailOptions) {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { 
      name: process.env.EMAIL_FROM_NAME || "JANUZEN Global LLP", 
      email: process.env.EMAIL_FROM_ADDRESS || "team@januzen.in" 
    };
    sendSmtpEmail.to = options.to;
    sendSmtpEmail.subject = options.subject;
    sendSmtpEmail.htmlContent = options.htmlContent;
    sendSmtpEmail.textContent = options.textContent || "";
    
    if (options.attachment) {
      sendSmtpEmail.attachment = options.attachment;
    }

    try {
      await apiInstance.sendTranslocationalEmail(sendSmtpEmail);
      console.log(`[EMAIL] Email sent to ${options.to[0].email}: ${options.subject}`);
    } catch (err) {
      console.error(`[EMAIL] Failed to send email to ${options.to[0].email}:`, err);
      throw err;
    }
  }
};
