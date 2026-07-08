import { BrevoClient } from "@getbrevo/brevo";

// Lazy-initialized Brevo client to prevent startup crashes when API key is missing
let brevoClientInstance = null;

function getBrevoClient() {
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
const rateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_EMAILS_PER_MINUTE = 5; // allow maximum of 5 emails per minute per address

function isRateLimited(email) {
  const now = Date.now();
  if (!rateLimits.has(email)) {
    rateLimits.set(email, [now]);
    return false;
  }
  const timestamps = rateLimits.get(email).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= MAX_EMAILS_PER_MINUTE) {
    return true;
  }
  timestamps.push(now);
  rateLimits.set(email, timestamps);
  return false;
}

// Central HTML Envelope Template for all Transactional Emails
function getBrandedEnvelope(
  title,
  bodyHtml,
  badgeText = "NOTIFICATION",
  headerColor = "#0F6E56",
  badgeColor = "#10B981"
) {
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

export const EmailService = {
  /**
   * Primary method to send any transaction email through the Brevo Client SDK.
   */
  async sendEmail(options) {
    if (options.to.length === 0) return;
    const recipientEmail = options.to[0].email;

    // Apply rate limiting
    if (isRateLimited(recipientEmail)) {
      console.warn(`[EMAIL RATE LIMIT] Skipped email to ${recipientEmail} (Subject: "${options.subject}") - Rate limit exceeded.`);
      return;
    }

    try {
      const client = getBrevoClient();
      
      const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM_ADDRESS || "team@januzen.in";
      const senderName = process.env.BREVO_SENDER_NAME || process.env.EMAIL_FROM_NAME || "JANUZEN Global LLP";

      const payload = {
        sender: { 
          name: senderName, 
          email: senderEmail 
        },
        to: options.to,
        subject: options.subject,
        htmlContent: options.htmlContent,
        textContent: options.textContent || "",
        attachment: options.attachment
      };

      await client.transactionalEmails.sendTransacEmail(payload);
      console.log(`[EMAIL SUCCESS] Email sent via Brevo to ${recipientEmail}: "${options.subject}"`);
    } catch (err) {
      console.error(`[EMAIL ERROR] Failed to send email via Brevo to ${recipientEmail}:`, err.message || err);
      throw err;
    }
  },

  /**
   * Transactional: Welcome Email on User Registration
   */
  async sendWelcomeEmail(email, name) {
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
  async sendOtpEmail(email, name, otp, purpose) {
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
  async sendPasswordResetEmail(email, name) {
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
  async sendContactFormConfirmation(email, name, userSubject, message) {
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
  async testConnection() {
    try {
      const client = getBrevoClient();
      await client.senders.getSenders();
      return { success: true, details: "Brevo API Handshake & Senders retrieve successful." };
    } catch (err) {
      console.error("[EMAIL] Brevo connection handshake failed:", err.message || err);
      return { success: false, details: err.message || String(err) };
    }
  }
};
