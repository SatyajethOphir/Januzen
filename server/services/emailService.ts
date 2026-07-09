import { BrevoClient } from "@getbrevo/brevo";

// Lazy-initialized Brevo client to prevent startup crashes when API key is missing
let brevoClientInstance: BrevoClient | null = null;

function getBrevoClient(): BrevoClient {
  if (!brevoClientInstance) {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error("BREVO_API_KEY environment variable is required");
    }
    brevoClientInstance = new BrevoClient({ apiKey });
  }
  return brevoClientInstance;
}

// Simple in-memory rate limiting map: email -> timestamps
const rateLimits = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_EMAILS_PER_MINUTE = 5; // allow maximum of 5 emails per minute per address

function isRateLimited(email: string): boolean {
  const now = Date.now();
  if (!rateLimits.has(email)) {
    rateLimits.set(email, [now]);
    return false;
  }
  const timestamps = rateLimits.get(email)!.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= MAX_EMAILS_PER_MINUTE) {
    return true;
  }
  timestamps.push(now);
  rateLimits.set(email, timestamps);
  return false;
}

interface EmailOptions {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachment?: { name: string; content: string }[];
}

// Central HTML Envelope Template for all Transactional Emails
function getBrandedEnvelope(
  title: string,
  bodyHtml: string,
  badgeText = "NOTIFICATION",
  headerColor = "#0F6E56",
  badgeColor = "#10B981"
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
      <!-- Header Banner -->
      <div style="background: ${headerColor}; padding: 24px; text-align: center;">
        <span style="background: rgba(255,255,255,0.15); color: #FFFFFF; font-size: 10px; font-family: monospace; font-weight: bold; padding: 4px 10px; border-radius: 20px; letter-spacing: 1px; display: inline-block; margin-bottom: 8px;">${badgeText}</span>
        <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800;">JANUZEN Global LLP</h1>
        <p style="color: #A7F3D0; margin: 4px 0 0 0; font-size: 12px;">Nuthan Medicals & JA Stationery Division</p>
      </div>

      <!-- Main Body -->
      <div style="padding: 28px 24px; background: #ffffff;">
        <h3 style="color: #0D1B2A; font-size: 18px; margin: 0 0 16px 0;">${title}</h3>
        ${bodyHtml}
        
        <p style="color: #64748B; font-size: 12px; line-height: 1.5; margin-top: 24px; border-top: 1px solid #F1F5F9; padding-top: 16px;">
          This is an automated notification from the JANUZEN Unified Transactional Email Service. If you have inquiries, reply to this email or contact us at <a href="mailto:team@januzen.in" style="color: #0F6E56;">team@januzen.in</a>.
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #F8FAFC; padding: 16px; text-align: center; color: #64748B; font-size: 11px; border-top: 1px solid #E2E8F0;">
        <strong>JANUZEN Global LLP</strong> | Nuthan Medicals & JA Stationery | <a href="https://januzen.in" style="color: #0F6E56; text-decoration: none;">januzen.in</a><br/>
        <span style="font-size: 10px; color: #94A3B8;">Gajularamaram, Hyderabad, Telangana — Corporate Facility & Healthcare Logistics</span>
      </div>
    </div>
  `;
}

/**
 * Strips HTML tags and decodes entities to produce safe textContent.
 * Ensures a valid non-empty text content is ALWAYS returned.
 */
function htmlToText(html: string): string {
  if (!html) return "Please view this email in an HTML-compatible email reader.";
  let text = html;
  
  // Replace line breaks / list items / table rows / paragraph tags with plain formatting
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/h[1-6]>/gi, "\n\n");
  text = text.replace(/<\/tr>/gi, "\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<li>/gi, "• ");
  text = text.replace(/<\/li>/gi, "\n");
  
  // Strip all other HTML tags
  text = text.replace(/<[^>]+>/g, "");
  
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  
  // Trim and collapse multiple consecutive newlines or spaces
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n\s*\n+/g, "\n\n");
  
  const trimmed = text.trim();
  return trimmed || "Please view this email in an HTML-compatible email reader.";
}

/**
 * Determines if an error is temporary (network issue or 5xx server-side error)
 */
function isTransientError(err: any): boolean {
  if (err.code && ["ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN", "EHOSTUNREACH", "ENETUNREACH"].includes(err.code)) {
    return true;
  }
  const status = err.status || err.statusCode || (err.response && err.response.status);
  if (status && (status >= 500 || status === 429)) {
    return true;
  }
  return false;
}

/**
 * Standard retry pattern with exponential backoff
 */
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries > 0 && isTransientError(err)) {
      console.warn(`[EMAIL RETRY] Transient error encountered: ${err.message || err}. Retrying in ${delay}ms... (Remaining: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

export const EmailService = {
  /**
   * Primary method to send any transaction email through the Brevo Client SDK.
   */
  async sendEmail(options: EmailOptions) {
    if (!options.to || options.to.length === 0) {
      console.warn("[EMAIL SKIPPED] No recipients specified in options.");
      return;
    }
    
    const recipientEmail = options.to[0].email;
    if (!recipientEmail) {
      console.warn("[EMAIL SKIPPED] Recipient email is empty.");
      return;
    }

    // Apply rate limiting
    if (isRateLimited(recipientEmail)) {
      console.warn(`[EMAIL RATE LIMIT] Skipped email to ${recipientEmail} (Subject: "${options.subject}") - Rate limit exceeded.`);
      return;
    }

    // Validate request payload parameters
    if (!options.subject) {
      throw new Error("Email subject is required");
    }
    if (!options.htmlContent) {
      throw new Error("Email htmlContent is required");
    }

    // Automatically generate valid non-empty textContent if not provided
    const textContent = options.textContent && options.textContent.trim().length > 0
      ? options.textContent
      : htmlToText(options.htmlContent);

    try {
      const client = getBrevoClient();
      
      const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM_ADDRESS || "team@januzen.in";
      const senderName = process.env.BREVO_SENDER_NAME || process.env.EMAIL_FROM_NAME || "JANUZEN Global LLP";

      const payload = {
        sender: { 
          name: senderName, 
          email: senderEmail 
        },
        to: options.to.map(r => ({ email: r.email, name: r.name || "Customer" })),
        subject: options.subject,
        htmlContent: options.htmlContent,
        textContent: textContent,
        attachment: options.attachment
      };

      // Logging request payload details for transparency and debugging
      console.log(`[EMAIL SENDING] Initiating Brevo REST call to ${recipientEmail} (Subject: "${options.subject}")`);
      console.log(`[EMAIL PAYLOAD LOG]`, JSON.stringify({
        sender: payload.sender,
        to: payload.to,
        subject: payload.subject,
        attachmentCount: payload.attachment ? payload.attachment.length : 0,
        textContentLength: payload.textContent.length,
        htmlContentLength: payload.htmlContent.length
      }, null, 2));

      // Invoke Brevo transaction API using transient retry wrapper
      await retryWithBackoff(async () => {
        return await client.transactionalEmails.sendTransacEmail(payload);
      });

      console.log(`[EMAIL SUCCESS] Email sent successfully via Brevo to ${recipientEmail}: "${options.subject}"`);
    } catch (err: any) {
      console.error(`[EMAIL ERROR] Failed to send email via Brevo to ${recipientEmail}:`, err.message || err);
      if (err.response && err.response.body) {
        console.error(`[EMAIL ERROR RESPONSE BODY]`, JSON.stringify(err.response.body));
      }
      throw err;
    }
  },

  /**
   * Transactional: Welcome Email on User Registration
   */
  async sendWelcomeEmail(email: string, name: string) {
    const title = `Welcome to JANUZEN, ${name}!`;
    const subject = `Welcome to JANUZEN!`;
    const bodyHtml = `
      <p>We are absolutely thrilled to welcome you to the JANUZEN family!</p>
      <p>Your account has been successfully registered. You now have full access to our premium services:</p>
      <ul style="color: #475569; font-size: 14px; padding-left: 20px; line-height: 1.6;">
        <li>🏥 <strong>Nuthan Medicals:</strong> Certified standard healthcare dispatches and prescription refills.</li>
        <li>📝 <strong>JA Stationery:</strong> High-opacity copypaper and certified standard office supplies.</li>
        <li>⚡ <strong>Zero-Emissions Logistics:</strong> Enjoy lightning-fast local dispatches tracked in real-time.</li>
      </ul>
      <p>Log in to your account anytime to track your orders, manage prescriptions, or explore new products.</p>
    `;
    const htmlContent = getBrandedEnvelope(title, bodyHtml, "WELCOME TO JANUZEN", "#0F6E56", "#10B981");
    await this.sendEmail({
      to: [{ email, name }],
      subject,
      htmlContent
    });
  },

  /**
   * Transactional: One-Time Password Verification
   */
  async sendOtpEmail(email: string, name: string, otp: string, purpose: string) {
    const title = "Security Verification Code";
    const subject = `[JANUZEN] Your OTP Code: ${otp}`;
    const cleanPurpose = purpose.replace("otp_", "").toUpperCase().replace("_", " ");
    const bodyHtml = `
      <p>Dear ${name},</p>
      <p>A request was received to verify your identity on JANUZEN for <strong>${cleanPurpose}</strong>.</p>
      <div style="background: #F8FAFC; border: 2px dashed #0F6E56; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Your One-Time Password (OTP)</p>
        <div style="font-size: 32px; font-family: 'Courier New', Courier, monospace; font-weight: 900; color: #0F6E56; letter-spacing: 8px;">${otp}</div>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #EF4444; font-weight: bold;">⚠️ Valid for 10 minutes. Never share this code with anyone, including JANUZEN staff.</p>
      </div>
      <p>If you did not request this code, please change your security parameters immediately.</p>
    `;
    const htmlContent = getBrandedEnvelope(title, bodyHtml, "SECURE OTP VERIFICATION", "#0D1B2A", "#F59E0B");
    await this.sendEmail({
      to: [{ email, name }],
      subject,
      htmlContent
    });
  },

  /**
   * Transactional: Password Reset / Changed Security Alert
   */
  async sendPasswordResetEmail(email: string, name: string) {
    const title = "Password Update Notification";
    const subject = `[JANUZEN] Security Alert: Password Updated`;
    const bodyHtml = `
      <p>Dear ${name},</p>
      <p>This is to confirm that your JANUZEN account password has been successfully updated or recovered.</p>
      <p>If you authorized this change, no further action is required on your part.</p>
      <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 16px; margin: 20px 0; color: #854D0E; font-size: 13px; line-height: 1.5;">
        <strong>⚠️ Security Alert:</strong> If you did not request this password change, please contact us at <a href="mailto:team@januzen.in" style="color: #B45309; font-weight: bold;">team@januzen.in</a> immediately to lock and protect your account.
      </div>
    `;
    const htmlContent = getBrandedEnvelope(title, bodyHtml, "SECURITY PARAMETER RESET", "#1E293B", "#EF4444");
    await this.sendEmail({
      to: [{ email, name }],
      subject,
      htmlContent
    });
  },

  /**
   * Transactional: Contact Form Confirmation
   */
  async sendContactFormConfirmation(email: string, name: string, userSubject: string, message: string) {
    const title = "We Received Your Inquiry";
    const subject = `[JANUZEN] We received your inquiry: ${userSubject}`;
    const bodyHtml = `
      <p>Dear ${name},</p>
      <p>Thank you for reaching out to us. We have successfully received your message and a JANUZEN representative has logged it into our support queue.</p>
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px; margin: 20px 0; font-size: 13px; color: #475569; line-height: 1.6;">
        <h4 style="margin: 0 0 8px 0; color: #0D1B2A; font-size: 14px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">Your Inquiry Details</h4>
        <p style="margin: 4px 0;"><strong>Subject:</strong> ${userSubject}</p>
        <p style="white-space: pre-line; margin-top: 8px; background: white; padding: 10px; border-radius: 4px; border: 1px solid #F1F5F9; color: #1E293B;">${message}</p>
      </div>
      <p>Our typical support turnaround time is within 24 business hours. If your request requires urgent delivery dispatch coordinates, feel free to contact us via the help desk.</p>
    `;
    const htmlContent = getBrandedEnvelope(title, bodyHtml, "INQUIRY LOGGED", "#0F6E56", "#3B82F6");
    await this.sendEmail({
      to: [{ email, name }],
      subject,
      htmlContent
    });
  },

  /**
   * API Connectivity & Credentials Handshake Check
   */
  async testConnection(): Promise<{ success: boolean; details: string }> {
    try {
      const client = getBrevoClient();
      await client.senders.getSenders();
      return { success: true, details: "Brevo API Handshake & Senders retrieve successful." };
    } catch (err: any) {
      console.error("[EMAIL] Brevo connection handshake failed:", err.message || err);
      return { success: false, details: err.message || String(err) };
    }
  }
};
