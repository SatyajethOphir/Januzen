import { EmailService } from "./services/emailService";
import { InvoiceService } from "./services/invoiceService";

export async function sendInvoiceEmail(order: any, pdfBuffer: Buffer): Promise<void> {
  try {
    await EmailService.sendEmail({
      to: [{ email: order.userEmail, name: order.userName || "Customer" }],
      subject: `Your JANUZEN Invoice — ${order.orderId}`,
      htmlContent: InvoiceService.getInvoiceHtml(order),
      attachment: [{
        name: `JANUZEN-Invoice-${order.orderId}.pdf`,
        content: pdfBuffer.toString("base64")
      }]
    });
  } catch (err) {
    console.error(`[MAILER] Failed to send invoice email for order ${order.orderId}:`, err);
    throw err;
  }
}

export async function sendOfflineBillEmail(data: any, pdfBuffer: Buffer): Promise<void> {
  try {
    await EmailService.sendEmail({
      to: [{ email: data.customerEmail, name: data.customerName || "Customer" }],
      subject: `Your JANUZEN Bill — ${data.billNumber}`,
      htmlContent: InvoiceService.getOfflineBillHtml(data),
      attachment: [{
        name: `JANUZEN-Bill-${data.billNumber}.pdf`,
        content: pdfBuffer.toString("base64")
      }]
    });
  } catch (err) {
    console.error(`[MAILER] Failed to send bill email for bill ${data.billNumber}:`, err);
    throw err;
  }
}

export async function testSmtpConnection(): Promise<{ success: boolean; details: string }> {
  return EmailService.testConnection();
}
