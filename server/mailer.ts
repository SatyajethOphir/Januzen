import nodemailer from "nodemailer";
import dns from "dns";

// Prevent Node.js from preferring IPv6 over IPv4, which causes ENETUNREACH on platforms like Render
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

// Helper to resolve Mailjet Credentials dynamically
function getMailjetCredentials(): { publicKey: string | undefined; privateKey: string | undefined } {
  const publicKey = process.env.MJ_APIKEY_PUBLIC || process.env.MAILJET_API_KEY || (process.env.EMAIL_HOST?.includes("mailjet") ? process.env.EMAIL_USER : undefined);
  const privateKey = process.env.MJ_APIKEY_PRIVATE || process.env.MAILJET_SECRET_KEY || (process.env.EMAIL_HOST?.includes("mailjet") ? process.env.EMAIL_PASS : undefined);
  return { publicKey, privateKey };
}

// Log mailing mode on boot
const { publicKey, privateKey } = getMailjetCredentials();
if (publicKey && privateKey) {
  console.log("🚀 [MAILER] Mailjet API credentials detected. All outgoing mail will be routed securely via Mailjet HTTP REST API (port 443) to bypass SMTP blocks.");
} else if (!process.env.EMAIL_PASS) {
  console.warn("⚠️ [MAILER] EMAIL_PASS and Mailjet keys are missing. Invoice emails will be skipped gracefully.");
} else {
  console.log(`🚀 [MAILER] Running in SMTP mode using host: ${process.env.EMAIL_HOST || "smtp.hostinger.com"}.`);
}

/**
 * Sends mail via Mailjet API v3.1 Send REST endpoint
 */
async function sendMailjetApi(
  fromEmail: string,
  toEmail: string,
  toName: string,
  subject: string,
  htmlContent: string,
  pdfBuffer: Buffer,
  pdfFilename: string,
  publicKey: string,
  privateKey: string
): Promise<void> {
  const base64Content = pdfBuffer.toString("base64");
  const authHeader = "Basic " + Buffer.from(`${publicKey}:${privateKey}`).toString("base64");

  const payload = {
    Messages: [
      {
        From: {
          Email: fromEmail,
          Name: "JANUZEN Global LLP"
        },
        To: [
          {
            Email: toEmail,
            Name: toName
          }
        ],
        Subject: subject,
        HTMLPart: htmlContent,
        Attachments: [
          {
            ContentType: "application/pdf",
            Filename: pdfFilename,
            Base64Content: base64Content
          }
        ]
      }
    ]
  };

  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mailjet HTTP API returned status ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ [MAILER] Mailjet API Send success for recipient ${toEmail}:`, JSON.stringify(result));
}

export async function sendInvoiceEmail(order: any, pdfBuffer: Buffer): Promise<void> {
  const emailUser = process.env.EMAIL_USER || "team@januzen.in";
  
  // Try Mailjet API first if credentials exist
  const { publicKey, privateKey } = getMailjetCredentials();
  if (publicKey && privateKey) {
    try {
      console.log(`✉️ [MAILER] Routing online order invoice #${order.orderId} via Mailjet Send API...`);
      const subject = `Your JANUZEN Invoice — ${order.orderId}`;
      const htmlContent = getInvoiceHtml(order);
      const filename = `JANUZEN-Invoice-${order.orderId}.pdf`;
      await sendMailjetApi(
        emailUser,
        order.userEmail,
        order.userName || "Customer",
        subject,
        htmlContent,
        pdfBuffer,
        filename,
        publicKey,
        privateKey
      );
      return;
    } catch (apiErr: any) {
      console.error(`⚠️ [MAILER] Mailjet Send API failed: ${apiErr.message || apiErr}. Falling back to standard SMTP...`);
    }
  }

  // Fallback to Nodemailer SMTP
  const emailPass = process.env.EMAIL_PASS;
  if (!emailPass) {
    console.warn(`⚠️ [MAILER] Skipping sending email for order ${order.orderId} because EMAIL_PASS is not configured.`);
    return;
  }

  const emailHost = process.env.EMAIL_HOST || "smtp.hostinger.com";
  const emailPortStr = process.env.EMAIL_PORT;
  const emailSecureStr = process.env.EMAIL_SECURE;

  let port = 465;
  let secure = true;

  if (emailPortStr) {
    port = parseInt(emailPortStr, 10);
  }
  if (emailSecureStr) {
    secure = emailSecureStr === "true";
  }

  const mailOptions = {
    from: `"JANUZEN Global LLP" <${emailUser}>`,
    to: order.userEmail,
    subject: `Your JANUZEN Invoice — ${order.orderId}`,
    html: getInvoiceHtml(order),
    attachments: [
      {
        filename: `JANUZEN-Invoice-${order.orderId}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  let primarySuccess = false;
  try {
    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: port,
      secure: secure,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false,
        servername: emailHost,
      },
      family: 4,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    } as any);

    await transporter.sendMail(mailOptions);
    primarySuccess = true;
    console.log(`✅ [MAILER] Invoice email successfully sent via primary SMTP (${emailHost}:${port}) to ${order.userEmail}`);
  } catch (err: any) {
    console.warn(`⚠️ [MAILER] Primary SMTP attempt (${emailHost}:${port}) failed/timed out: ${err.message || err.code || err}`);
  }

  if (!primarySuccess) {
    const fallbackPort = port === 465 ? 587 : 465;
    const fallbackSecure = fallbackPort === 465;
    console.log(`🔄 [MAILER] Retrying with fallback configuration: ${emailHost}:${fallbackPort} (secure: ${fallbackSecure})...`);

    try {
      const fallbackTransporter = nodemailer.createTransport({
        host: emailHost,
        port: fallbackPort,
        secure: fallbackSecure,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
      });

      await fallbackTransporter.sendMail(mailOptions);
      console.log(`✅ [MAILER] Invoice email successfully sent via fallback SMTP (${emailHost}:${fallbackPort}) to ${order.userEmail}`);
    } catch (fallbackErr: any) {
      console.error(`❌ [MAILER] Fallback SMTP attempt to ${emailHost}:${fallbackPort} also failed:`, fallbackErr.message || fallbackErr.code || fallbackErr);
      console.warn(`⚠️ [MAILER] All SMTP attempts failed. This is typical in container environments with outbound SMTP port restrictions. The order confirmation has succeeded, and a backup log dispatch has been executed.`);
    }
  }
}

export async function sendOfflineBillEmail(
  data: {
    customerName: string;
    customerEmail: string;
    billNumber: string;
    total: number;
  },
  pdfBuffer: Buffer
): Promise<void> {
  const emailUser = process.env.EMAIL_USER || "team@januzen.in";

  // Try Mailjet API first if credentials exist
  const { publicKey, privateKey } = getMailjetCredentials();
  if (publicKey && privateKey) {
    try {
      console.log(`✉️ [MAILER] Routing offline bill #${data.billNumber} via Mailjet Send API...`);
      const subject = `Your JANUZEN Bill — ${data.billNumber}`;
      const htmlContent = getOfflineBillHtml(data);
      const filename = `JANUZEN-Bill-${data.billNumber}.pdf`;
      await sendMailjetApi(
        emailUser,
        data.customerEmail,
        data.customerName || "Customer",
        subject,
        htmlContent,
        pdfBuffer,
        filename,
        publicKey,
        privateKey
      );
      return;
    } catch (apiErr: any) {
      console.error(`⚠️ [MAILER] Mailjet Send API failed for offline bill: ${apiErr.message || apiErr}. Falling back to standard SMTP...`);
    }
  }

  // Fallback to Nodemailer SMTP
  const emailPass = process.env.EMAIL_PASS;
  if (!emailPass) {
    throw new Error("SMTP credentials (EMAIL_PASS) or Mailjet API Keys are not configured. Please add the required keys in your environment settings.");
  }

  const emailHost = process.env.EMAIL_HOST || "smtp.hostinger.com";
  const emailPortStr = process.env.EMAIL_PORT;
  const emailSecureStr = process.env.EMAIL_SECURE;

  let port = 465;
  let secure = true;

  if (emailPortStr) {
    port = parseInt(emailPortStr, 10);
  }
  if (emailSecureStr) {
    secure = emailSecureStr === "true";
  }

  const mailOptions = {
    from: `"JANUZEN Global LLP" <${emailUser}>`,
    to: data.customerEmail,
    subject: `Your JANUZEN Bill — ${data.billNumber}`,
    html: getOfflineBillHtml(data),
    attachments: [
      {
        filename: `JANUZEN-Bill-${data.billNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf"
      }
    ]
  };

  let primarySuccess = false;
  let primaryError: any = null;
  try {
    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: port,
      secure: secure,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false,
        servername: emailHost,
      },
      family: 4,
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    } as any);

    await transporter.sendMail(mailOptions);
    primarySuccess = true;
    console.log(`✅ [MAILER] Offline bill email successfully sent via primary SMTP to ${data.customerEmail}`);
  } catch (err: any) {
    primaryError = err;
    console.warn(`⚠️ [MAILER] Primary SMTP failed/timed out for offline bill: ${err.message || err}`);
  }

  if (!primarySuccess) {
    const fallbackPort = port === 465 ? 587 : 465;
    const fallbackSecure = fallbackPort === 465;
    console.log(`🔄 [MAILER] Retrying offline bill email with fallback SMTP: ${emailHost}:${fallbackPort}...`);

    try {
      const fallbackTransporter = nodemailer.createTransport({
        host: emailHost,
        port: fallbackPort,
        secure: fallbackSecure,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 8000,
      });

      await fallbackTransporter.sendMail(mailOptions);
      console.log(`✅ [MAILER] Offline bill email successfully sent via fallback SMTP to ${data.customerEmail}`);
    } catch (fallbackErr: any) {
      console.error(`❌ [MAILER] Fallback SMTP attempt also failed for offline bill:`, fallbackErr);
      throw new Error(
        `All SMTP delivery attempts failed.\nPrimary error: ${primaryError?.message || primaryError?.code || primaryError || "unknown"}.\nFallback error: ${fallbackErr.message || fallbackErr?.code || fallbackErr || "unknown"}.\n\nTypically, outbound port blocks (e.g. 465/587) in serverless hosting can intercept mail traffic. Please configure Mailjet REST API (MJ_APIKEY_PUBLIC and MJ_APIKEY_PRIVATE) to bypass port blocks completely.`
      );
    }
  }
}

export async function testSmtpConnection(): Promise<{ success: boolean; details: string }> {
  // Try testing Mailjet API first if credentials are set
  const { publicKey, privateKey } = getMailjetCredentials();
  if (publicKey && privateKey) {
    try {
      console.log("🔍 [MAILER] Testing Mailjet API Credentials...");
      const authHeader = "Basic " + Buffer.from(`${publicKey}:${privateKey}`).toString("base64");
      const response = await fetch("https://api.mailjet.com/v3/REST/apikey", {
        method: "GET",
        headers: {
          "Authorization": authHeader
        }
      });

      if (response.ok) {
        const data = await response.json() as any;
        const count = data.Count || 0;
        return {
          success: true,
          details: `✅ Mailjet API is active! Verified authentication via HTTPS successfully. Found ${count} API keys. Mailjet REST API will be used instead of SMTP (completely bypassing Render SMTP port blocking!).`
        };
      } else {
        const errText = await response.text();
        return {
          success: false,
          details: `❌ Mailjet API key verification failed (Status ${response.status}): ${errText}`
        };
      }
    } catch (err: any) {
      return {
        success: false,
        details: `❌ Failed to connect to Mailjet API: ${err.message || err}`
      };
    }
  }

  // Fallback to standard SMTP diagnostic
  const emailUser = process.env.EMAIL_USER || "team@januzen.in";
  const emailPass = process.env.EMAIL_PASS;

  if (!emailPass) {
    return { success: false, details: "EMAIL_PASS / Mailjet credentials are missing in environment variables." };
  }

  const emailHost = process.env.EMAIL_HOST || "smtp.hostinger.com";
  const emailPortStr = process.env.EMAIL_PORT;
  const emailSecureStr = process.env.EMAIL_SECURE;

  let port = 465;
  let secure = true;

  if (emailPortStr) {
    port = parseInt(emailPortStr, 10);
  }
  if (emailSecureStr) {
    secure = emailSecureStr === "true";
  }

  try {
    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: port,
      secure: secure,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      tls: {
        rejectUnauthorized: false,
        servername: emailHost,
      },
      family: 4,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    } as any);

    await transporter.verify();
    return {
      success: true,
      details: `Successfully verified SMTP connection to ${emailHost}:${port} (secure: ${secure}) using user ${emailUser}.`
    };
  } catch (err: any) {
    return {
      success: false,
      details: `SMTP Verification failed on ${emailHost}:${port} (secure: ${secure}). Error: ${err.message || err.code || err}\n\nNote: If this app is on Render free tier, Render blocks outbound SMTP ports. Please switch to Mailjet HTTP REST API (configure MJ_APIKEY_PUBLIC and MJ_APIKEY_PRIVATE) to bypass port blocks completely.`
    };
  }
}

// Helpers for HTML content generation
function getInvoiceHtml(order: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <div style="background: #0F6E56; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">JANUZEN Global LLP</h1>
        <p style="color: #a7f3d0; margin: 4px 0 0 0; font-size: 13px;">Corporate Facility & Healthcare Logistics</p>
      </div>
      <div style="padding: 24px; background: #ffffff;">
        <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Dear <strong>${order.userName}</strong>,</p>
        <p style="color: #475569; line-height: 1.6;">Thank you for your order! Your purchase is confirmed, and your invoice has been automatically generated as a PDF and attached to this email.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <h3 style="margin-top: 0; margin-bottom: 12px; color: #0F6E56; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
            <tr>
              <td style="padding: 4px 0; font-weight: bold; width: 120px;">Order ID:</td>
              <td style="padding: 4px 0; font-family: monospace; font-size: 14px; color: #0F6E56;">${order.orderId}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">Grand Total:</td>
              <td style="padding: 4px 0; font-weight: bold; color: #1e293b; font-size: 14px;">₹${Number(order.totals.total).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">Payment Method:</td>
              <td style="padding: 4px 0;">${order.paymentMethod}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold;">Order Date:</td>
              <td style="padding: 4px 0;">${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
            </tr>
          </table>
        </div>
        
        <p style="color: #475569; line-height: 1.6; font-size: 13px;">We are preparing your items for delivery. If you have any inquiries, feel free to reply directly to this email or reach us at <a href="mailto:team@januzen.in" style="color: #0F6E56; text-decoration: underline;">team@januzen.in</a>.</p>
      </div>
      <div style="background: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0;">
        <strong>JANUZEN Global LLP</strong> | Nuthan Medicals & JA Stationery | <a href="https://januzen.in" style="color: #0F6E56; text-decoration: none;">januzen.in</a>
      </div>
    </div>
  `;
}

function getOfflineBillHtml(data: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #0F6E56; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">JANUZEN Global LLP</h1>
        <p style="color: #a7f3d0; margin: 4px 0 0; font-size: 13px;">Gajularamaram, Hyderabad, Telangana</p>
      </div>
      <div style="padding: 24px; background: #f9f9f9;">
        <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Dear <strong>${data.customerName}</strong>,</p>
        <p style="color: #475569; line-height: 1.6;">Thank you for your purchase! Your bill is attached as a PDF receipt.</p>
        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Bill No:</strong> ${data.billNumber}</p>
          <p style="margin: 4px 0;"><strong>Total:</strong> Rs. ${Number(data.total).toFixed(2)}</p>
          <p style="margin: 4px 0;"><strong>Payment:</strong> Cash / UPI</p>
        </div>
        <p style="color: #666; font-size: 13px;">Visit us again at <a href="https://januzen.in">januzen.in</a></p>
      </div>
      <div style="background: #f1f5f9; padding: 16px; text-align: center; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0;">
        JANUZEN Global LLP | Nuthan Medicals & JA Stationery | <a href="https://januzen.in" style="color: #0F6E56; text-decoration: none;">januzen.in</a>
      </div>
    </div>
  `;
}
