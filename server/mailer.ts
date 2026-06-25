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

  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  await transporter.sendMail({
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
  });
}
