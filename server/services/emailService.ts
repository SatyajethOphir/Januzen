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
   * Transactional: Welcome Email on User Registration (Disabled to optimize email usage)
   */
  async sendWelcomeEmail(email: string, name: string) {
    console.log(`[EMAIL OPTIMIZATION] Welcome email skipped for ${email} to minimize email usage as per policy.`);
  },

  /**
   * Transactional: One-Time Password Verification (Disabled to optimize email usage)
   */
  async sendOtpEmail(email: string, name: string, otp: string, purpose: string) {
    console.log(`[EMAIL OPTIMIZATION] OTP email skipped for ${email} (OTP: ${otp}) to minimize email usage as per policy.`);
  },

  /**
   * Transactional: Password Reset / Changed Security Alert (Disabled to optimize email usage)
   */
  async sendPasswordResetEmail(email: string, name: string) {
    console.log(`[EMAIL OPTIMIZATION] Password reset security alert email skipped for ${email} to minimize email usage as per policy.`);
  },

  /**
   * Transactional: Contact Form Confirmation (Disabled to optimize email usage)
   */
  async sendContactFormConfirmation(email: string, name: string, userSubject: string, message: string) {
    console.log(`[EMAIL OPTIMIZATION] Contact form confirmation skipped for ${email} (Subject: "${userSubject}") to minimize email usage as per policy.`);
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
