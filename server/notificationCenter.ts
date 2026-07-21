import nodemailer from "nodemailer";
import cron from "node-cron";
import { EmailService } from "./services/emailService";

/**
 * Unified Notification System for JANUZEN Enterprise
 * Integrates:
 * 1. OTP Verification (Registration, Login, Password Reset)
 * 2. Order Notifications (Placed, Confirmed, Packed, Out for Delivery, Delivered, Cancelled)
 * 3. Invoice & Bill (PDF Invoice Auto-generation & Emailing, Dashboard Download)
 * 4. Payment Notifications (Success, Failed, Refund Processed, COD Confirmation)
 * 5. Customer Notifications (Password Changed, Profile Updated, Wishlist Restock, Low Stock Warning)
 *
 * Channels supported: Email (Primary), Website Dashboard / Push (Secondary), WhatsApp (Optional)
 */

export type NotificationCategory =
  | "otp"
  | "order"
  | "invoice"
  | "payment"
  | "customer";

export type NotificationType =
  // 1. OTP Verification
  | "otp_registration"
  | "otp_login"
  | "otp_password_reset"
  // 2. Order Notifications
  | "order_placed"
  | "order_confirmed"
  | "order_packed"
  | "order_out_for_delivery"
  | "order_delivered"
  | "order_cancelled"
  // 3. Invoice & Bill
  | "invoice_generated"
  | "bill_generated"
  // 4. Payment Notifications
  | "payment_successful"
  | "payment_failed"
  | "payment_refunded"
  | "payment_cod_confirmed"
  // 5. Customer Notifications
  | "password_changed"
  | "profile_updated"
  | "wishlist_back_in_stock"
  | "low_stock_warning";

export type NotificationChannel = "email" | "website" | "whatsapp" | "push";

export interface UnifiedNotificationRequest {
  userId: string; // User ID or "all" for broadcasts
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  type: NotificationType;
  title: string;
  message: string;
  tag?: string;
  channels?: NotificationChannel[];
  linkUrl?: string;
  imageUrl?: string;
  metadata?: {
    otp?: string;
    orderId?: string;
    invoiceNumber?: string;
    amount?: number;
    paymentMethod?: string;
    paymentId?: string;
    itemName?: string;
    stockCount?: number;
    whatsappSupportPhone?: string;
    [key: string]: any;
  };
  pdfAttachment?: {
    filename: string;
    content: Buffer;
  };
}



/**
 * Builds HTML Email Template based on Notification Category & Type
 */
export function getUnifiedHtmlEmail(
  type: NotificationType,
  title: string,
  message: string,
  userName: string = "Valued Customer",
  metadata: any = {}
): string {
  let categoryBadge = "NOTIFICATION";
  let headerColor = "#0F6E56"; // JANUZEN Emerald
  let badgeColor = "#10B981";
  let contentBox = "";

  // Categorize
  if (type.startsWith("otp_")) {
    categoryBadge = "SECURE OTP VERIFICATION";
    headerColor = "#0D1B2A"; // Dark Navy
    badgeColor = "#F59E0B"; // Amber
    if (metadata.otp) {
      contentBox = `
        <div style="background: #F8FAFC; border: 2px dashed #0F6E56; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Your One-Time Password (OTP)</p>
          <div style="font-size: 32px; font-family: 'Courier New', Courier, monospace; font-weight: 900; color: #0F6E56; letter-spacing: 8px;">${metadata.otp}</div>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #EF4444; font-weight: bold;">⚠️ Valid for 10 minutes. Never share this code with anyone, including JANUZEN staff.</p>
        </div>
      `;
    }
  } else if (type.startsWith("order_")) {
    categoryBadge = "ORDER STATUS UPDATE";
    headerColor = "#0F6E56";
    badgeColor = type === "order_cancelled" ? "#EF4444" : "#10B981";
    contentBox = `
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px; margin: 20px 0;">
        <h4 style="margin: 0 0 12px 0; color: #0D1B2A; font-size: 14px; text-transform: uppercase;">Order Snapshot</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
          ${metadata.orderId ? `<tr><td style="padding: 4px 0; font-weight: bold;">Order Reference:</td><td style="padding: 4px 0; font-family: monospace; color: #0F6E56; font-weight: bold;">${metadata.orderId}</td></tr>` : ""}
          ${metadata.amount !== undefined ? `<tr><td style="padding: 4px 0; font-weight: bold;">Total Value:</td><td style="padding: 4px 0; font-weight: bold;">₹${Number(metadata.amount).toFixed(2)}</td></tr>` : ""}
          ${metadata.paymentMethod ? `<tr><td style="padding: 4px 0; font-weight: bold;">Payment Mode:</td><td style="padding: 4px 0;">${metadata.paymentMethod}</td></tr>` : ""}
          <tr><td style="padding: 4px 0; font-weight: bold;">Current Status:</td><td style="padding: 4px 0;"><span style="background: ${badgeColor}20; color: ${badgeColor}; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; text-transform: uppercase;">${type.replace("order_", "").replace("_", " ")}</span></td></tr>
        </table>
      </div>
    `;
  } else if (type === "invoice_generated" || type === "bill_generated") {
    categoryBadge = type === "invoice_generated" ? "OFFICIAL TAX INVOICE" : "DIGITAL RECEIPT & BILL";
    headerColor = "#0D1B2A";
    badgeColor = "#3B82F6";
    contentBox = `
      <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; color: #1E3A8A; font-size: 13px; font-weight: bold;">📄 Your official PDF invoice/receipt is attached to this email.</p>
        <p style="margin: 4px 0 0 0; color: #3B82F6; font-size: 11px;">You can also download this invoice anytime from your JANUZEN Account Dashboard under Orders History.</p>
      </div>
    `;
  } else if (type.startsWith("payment_")) {
    categoryBadge = "PAYMENT & TRANSACTION ALERT";
    headerColor = type === "payment_failed" ? "#991B1B" : "#065F46";
    badgeColor = type === "payment_failed" ? "#EF4444" : "#10B981";
    contentBox = `
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
          ${metadata.paymentId ? `<tr><td style="padding: 4px 0; font-weight: bold;">Transaction ID:</td><td style="padding: 4px 0; font-family: monospace;">${metadata.paymentId}</td></tr>` : ""}
          ${metadata.amount !== undefined ? `<tr><td style="padding: 4px 0; font-weight: bold;">Transaction Amount:</td><td style="padding: 4px 0; font-weight: bold; color: #0F6E56;">₹${Number(metadata.amount).toFixed(2)}</td></tr>` : ""}
          ${metadata.paymentMethod ? `<tr><td style="padding: 4px 0; font-weight: bold;">Payment Gateway/Mode:</td><td style="padding: 4px 0;">${metadata.paymentMethod}</td></tr>` : ""}
        </table>
      </div>
    `;
  } else {
    categoryBadge = "ACCOUNT & PROFILE NOTIFICATION";
    headerColor = "#1E293B";
    badgeColor = type === "low_stock_warning" ? "#F59E0B" : "#6366F1";
    if (metadata.itemName) {
      contentBox = `
        <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; color: #92400E; font-size: 13px;"><strong>Item Alert:</strong> ${metadata.itemName}</p>
          ${metadata.stockCount !== undefined ? `<p style="margin: 4px 0 0 0; color: #D97706; font-size: 12px; font-weight: bold;">Only ${metadata.stockCount} unit(s) remaining in stock!</p>` : ""}
        </div>
      `;
    }
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
      <!-- Header Banner -->
      <div style="background: ${headerColor}; padding: 24px; text-align: center;">
        <span style="background: rgba(255,255,255,0.15); color: #FFFFFF; font-size: 10px; font-family: monospace; font-weight: bold; padding: 4px 10px; border-radius: 20px; letter-spacing: 1px; display: inline-block; margin-bottom: 8px;">${categoryBadge}</span>
        <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800;">JANUZEN Global LLP</h1>
        <p style="color: #A7F3D0; margin: 4px 0 0 0; font-size: 12px;">Nuthan Medicals & JA Stationery Division</p>
      </div>

      <!-- Main Body -->
      <div style="padding: 28px 24px; background: #ffffff;">
        <p style="font-size: 16px; color: #1E293B; margin-top: 0;">Dear <strong>${userName}</strong>,</p>
        <h3 style="color: #0D1B2A; font-size: 18px; margin: 16px 0 8px 0;">${title}</h3>
        <p style="color: #475569; line-height: 1.6; font-size: 14px; margin: 0;">${message}</p>
        
        ${contentBox}

        ${metadata.whatsappSupportPhone ? `
          <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 14px; margin: 20px 0; display: flex; align-items: center; justify-content: space-between;">
            <div style="font-size: 12px; color: #065F46;">
              <strong>💬 WhatsApp Instant Assistance:</strong> Need urgent delivery support or manual order coordination?
            </div>
            <a href="https://wa.me/${metadata.whatsappSupportPhone}?text=Hello%20JANUZEN%20Support,%20regarding%20${encodeURIComponent(title)}" target="_blank" style="background: #10B981; color: white; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: bold; text-decoration: none; display: inline-block;">Chat on WhatsApp</a>
          </div>
        ` : ""}

        <p style="color: #64748B; font-size: 12px; line-height: 1.5; margin-top: 24px; border-top: 1px solid #F1F5F9; pt: 16px;">
          This is an automated notification from the JANUZEN Unified Notification Center. If you have inquiries, reply to this email or contact us at <a href="mailto:team@januzen.in" style="color: #0F6E56;">team@januzen.in</a>.
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




// sendViaSmtp has been removed to avoid SMTP ENETUNREACH issues on Render. Brevo REST HTTPS API is used exclusively.


/**
 * Core Dispatcher: Sends Unified Notification across selected channels
 */
export async function sendUnifiedNotification(
  req: UnifiedNotificationRequest,
  dbClient: any,
  sendRealtimeNotificationFn: (userId: string, notif: any) => void,
  sendWebPushFn: (userId: string, title: string, content: string, linkUrl?: string, imageUrl?: string, tag?: string) => Promise<any>
): Promise<{ success: boolean; channelsDispatched: string[]; error?: string }> {
  const channels = req.channels || ["email", "website", "push"];
  const channelsDispatched: string[] = [];

  const userName = req.userName || "Customer";
  const userEmail = req.userEmail;

  // 1. Website Dashboard Notification (MongoDB + SSE Stream)
  if (channels.includes("website") || channels.includes("push")) {
    try {
      const notifDoc = {
        id: req.tag || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: req.userId,
        title: req.title,
        content: req.message,
        linkUrl: req.linkUrl || (req.metadata?.orderId ? `/#/orders` : undefined),
        imageUrl: req.imageUrl,
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      // Persist in DB if valid user or broadcast
      if (dbClient && typeof dbClient.createNotification === "function") {
        await dbClient.createNotification(notifDoc);
      }

      // Real-time SSE Stream dispatch
      if (typeof sendRealtimeNotificationFn === "function") {
        sendRealtimeNotificationFn(req.userId, notifDoc);
      }
      channelsDispatched.push("website");

      // Web Push dispatch
      if (channels.includes("push") && typeof sendWebPushFn === "function") {
        await sendWebPushFn(req.userId, req.title, req.message, notifDoc.linkUrl, req.imageUrl, req.tag);
        channelsDispatched.push("push");
      }
    } catch (dbErr) {
      // Dispatch error handled silently
    }
  }

  // 2. Email Channel (Brevo REST or Nodemailer SMTP)
  if (channels.includes("email") && userEmail) {
    try {
      const htmlContent = getUnifiedHtmlEmail(req.type, req.title, req.message, userName, req.metadata);
      const subject = `[JANUZEN] ${req.title}`;

      let attachments: { name: string; content: string }[] | undefined = undefined;
      if (req.pdfAttachment) {
        attachments = [{
          name: req.pdfAttachment.filename,
          content: req.pdfAttachment.content.toString("base64")
        }];
      }

      if (process.env.BREVO_API_KEY) {
        try {
          await EmailService.sendEmail({
            to: [{ email: userEmail, name: userName }],
            subject,
            htmlContent,
            attachment: attachments
          });
          channelsDispatched.push("email(brevo)");
        } catch (brevoErr: any) {
          console.error(`[UNIFIED NOTIFICATION] Brevo API failed:`, brevoErr.message || brevoErr);
        }
      } else {
        console.log(`[UNIFIED NOTIFICATION] Email simulation mode (no BREVO_API_KEY). Sent to ${userEmail}: "${subject}"`);
        channelsDispatched.push("email(simulated)");
      }
    } catch (emailErr: any) {
      console.error(`❌ [UNIFIED NOTIFICATION] Email dispatch error to ${userEmail}:`, emailErr.message || emailErr);
    }
  }

  // 3. WhatsApp Optional Support Channel
  if (channels.includes("whatsapp") && (req.userPhone || req.metadata?.whatsappSupportPhone)) {
    try {
      const phone = req.userPhone || req.metadata?.whatsappSupportPhone || "919666588553";
      channelsDispatched.push("whatsapp");
    } catch (waErr) {
      // Silent catch
    }
  }

  return {
    success: channelsDispatched.length > 0,
    channelsDispatched,
  };
}

/**
 * Initialize node-cron Background Jobs for Automated Notifications & Sweeps
 */
export function initNotificationCronJobs(
  dbClient: any,
  sendRealtimeNotificationFn: (userId: string, notif: any) => void,
  sendWebPushFn: (userId: string, title: string, content: string, linkUrl?: string, imageUrl?: string) => Promise<any>
) {
  // Job 1: Run every hour — check for low stock warning and wishlist restock reminders
  cron.schedule("0 * * * *", async () => {
    try {
      if (dbClient && typeof dbClient.getProducts === "function") {
        const products = await dbClient.getProducts();
        const lowStockProducts = (products || []).filter((p: any) => p.isActive && p.stock <= (p.lowStockThreshold || 5));
        for (const p of lowStockProducts) {
          await sendUnifiedNotification(
            {
              userId: "all",
              type: "low_stock_warning",
              title: "Low Stock Alert ⚡",
              message: `Low stock alert: "${p.name}" has only ${p.stock} units remaining!`,
              channels: ["website"],
              metadata: { productId: p.id, itemName: p.name, stockCount: p.stock },
            },
            dbClient,
            sendRealtimeNotificationFn,
            sendWebPushFn
          );
        }
      }
    } catch (err) {
      console.error("❌ [NODE-CRON] Error in hourly notification check:", err);
    }
  });

  // Job 2: Run daily at midnight (00:00) — prune old notifications and sweep expired sessions
  cron.schedule("0 0 * * *", async () => {
    try {
      if (dbClient && typeof dbClient.pruneOldNotifications === "function") {
        await dbClient.pruneOldNotifications(30); // 30 days retention
      }
    } catch (err) {
      console.error("❌ [NODE-CRON] Error in daily retention sweep:", err);
    }
  });
}
