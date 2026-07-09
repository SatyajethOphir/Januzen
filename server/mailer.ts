import { EmailService } from "./services/emailService";
import { getInvoiceHtml, getOfflineBillHtml } from "./invoice";
import { dbClient } from "./db";

export async function sendInvoiceEmail(order: any, pdfBuffer: Buffer): Promise<void> {
  try {
    // Fetch latest order from database to check deduplication
    const latestOrder = await dbClient.getOrderById(order.id);
    if (latestOrder && latestOrder.invoiceEmailSent) {
      console.log(`[DEDUPLICATION] Invoice email already sent for order ${order.orderId}. Skipping duplicate.`);
      return;
    }

    await EmailService.sendEmail({
      to: [{ email: order.userEmail, name: order.userName || "Customer" }],
      subject: `Your JANUZEN Invoice — ${order.orderId}`,
      htmlContent: getInvoiceHtml(order),
      attachment: [{
        name: `JANUZEN-Invoice-${order.orderId}.pdf`,
        content: pdfBuffer.toString("base64")
      }]
    });

    // Mark as sent to prevent duplicates
    await dbClient.updateOrderInvoiceEmailSent(order.id, true);
    console.log(`[MAILER] Invoice email sent successfully and marked in DB for order ${order.orderId}`);
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
      htmlContent: getOfflineBillHtml(data),
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
