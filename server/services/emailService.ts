import { BrevoClient } from "@getbrevo/brevo";

// Singleton Brevo client for the modern SDK
const brevoClient = new BrevoClient({ apiKey: process.env.BREVO_API_KEY || "dummy-key-for-load" });

interface EmailOptions {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachment?: { name: string; content: string }[];
}

export const EmailService = {
  async sendEmail(options: EmailOptions) {
    const payload = {
      sender: { 
        name: process.env.EMAIL_FROM_NAME || "JANUZEN Global LLP", 
        email: process.env.EMAIL_FROM_ADDRESS || "team@januzen.in" 
      },
      to: options.to,
      subject: options.subject,
      htmlContent: options.htmlContent,
      textContent: options.textContent || "",
      attachment: options.attachment
    };

    try {
      await brevoClient.transactionalEmails.sendTransacEmail(payload);
      console.log(`[EMAIL] Email sent via Brevo to ${options.to[0].email}: ${options.subject}`);
    } catch (err) {
      console.error(`[EMAIL] Failed to send email via Brevo to ${options.to[0].email}:`, err);
      throw err;
    }
  },

  async testConnection(): Promise<{ success: boolean; details: string }> {
    try {
      // Fetch senders to verify API connectivity
      await brevoClient.senders.getSenders();
      return { success: true, details: "Brevo SMTP client handshake successful." };
    } catch (err: any) {
      console.error("[EMAIL] Brevo health check failed:", err);
      return { success: false, details: err.message || String(err) };
    }
  }
};
