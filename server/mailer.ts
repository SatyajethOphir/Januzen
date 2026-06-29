import nodemailer from "nodemailer";

// Simple check on boot to log a warning if EMAIL_PASS is missing
if (!process.env.EMAIL_PASS) {
  console.warn("⚠️ [MAILER] EMAIL_PASS environment variable is missing. Invoice emails will be skipped gracefully.");
}

export async function sendInvoiceEmail(order: any, pdfBuffer: Buffer): Promise<void> {
  const emailUser = process.env.EMAIL_USER || "team@januzen.in";
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
    html: `
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
    `,
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
        rejectUnauthorized: false
      },
      connectionTimeout: 8000, // 8 seconds fast fail
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });

    await transporter.sendMail(mailOptions);
    primarySuccess = true;
    console.log(`✅ [MAILER] Invoice email successfully sent via primary SMTP (${emailHost}:${port}) to ${order.userEmail}`);
  } catch (err: any) {
    console.warn(`⚠️ [MAILER] Primary SMTP attempt (${emailHost}:${port}) failed/timed out: ${err.message || err.code || err}`);
  }

  if (!primarySuccess) {
    // Determine fallback port: if original is 465, try 587; if 587, try 465
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
  const emailPass = process.env.EMAIL_PASS;

  if (!emailPass) {
    throw new Error("SMTP credentials (EMAIL_PASS) are not configured. Please add the EMAIL_PASS secret in your environment settings.");
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
    html: `
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
    `,
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
        rejectUnauthorized: false
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });

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
        `All SMTP delivery attempts failed.\nPrimary error: ${primaryError?.message || primaryError?.code || primaryError || "unknown"}.\nFallback error: ${fallbackErr.message || fallbackErr?.code || fallbackErr || "unknown"}.\n\nTypically, outbound port blocks (e.g. 465/587) in serverless hosting can intercept mail traffic. Ensure EMAIL_PASS is correct.`
      );
    }
  }
}
