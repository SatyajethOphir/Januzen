import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import https from "https";

export const InvoiceService = {
  async fetchLogo(): Promise<Buffer | null> {
    return new Promise((resolve) => {
      try {
        const localLogoPath = path.join(process.cwd(), "public", "logo.png");
        if (fs.existsSync(localLogoPath)) {
          resolve(fs.readFileSync(localLogoPath));
          return;
        }
      } catch (e) {}

      const req = https.get("https://januzen.in/logo.png", { timeout: 3000 }, (res) => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        const data: any[] = [];
        res.on("data", (chunk) => data.push(chunk));
        res.on("end", () => resolve(Buffer.concat(data)));
      });
      req.on("error", () => resolve(null));
    });
  },

  async generateInvoice(order: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: "A4", margin: 50 });
        const buffers: Buffer[] = [];
        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        const logoBuffer = await this.fetchLogo();

        if (logoBuffer) {
          doc.image(logoBuffer, 50, 45, { width: 50 });
          doc.fontSize(18).fillColor("#0F6E56").font("Helvetica-Bold").text("JANUZEN Global LLP", 115, 45);
        } else {
          doc.fontSize(18).fillColor("#0F6E56").font("Helvetica-Bold").text("JANUZEN Global LLP", 50, 45);
        }

        doc.fontSize(8).fillColor("#475569").font("Helvetica")
           .text("Gajularamaram, Hyderabad, Telangana", logoBuffer ? 115 : 50, 63)
           .text("Email: team@januzen.in | Phone: +91-9666588553", logoBuffer ? 115 : 50, 75);

        doc.fontSize(16).fillColor("#0F6E56").font("Helvetica-Bold").text("TAX INVOICE", 350, 45, { align: "right", width: 195 });
        doc.rect(50, 95, 495, 2).fill("#0F6E56");

        doc.fontSize(10).fillColor("#0F6E56").font("Helvetica-Bold").text("BILL TO:", 50, 115);
        doc.fontSize(10).fillColor("#0F172A").font("Helvetica-Bold").text(order.userName, 50, 130);
        
        // Add itemized list
        let y = 160;
        doc.fontSize(10).fillColor("#475569").font("Helvetica-Bold").text("Description", 50, y);
        doc.text("Qty", 350, y);
        doc.text("Price", 450, y);
        
        y += 20;
        doc.rect(50, y, 495, 1).fill("#e2e8f0");
        y += 10;
        
        doc.fontSize(10).fillColor("#1e293b").font("Helvetica");
        for (const item of order.items) {
          doc.text(item.name, 50, y);
          doc.text(item.quantity.toString(), 350, y);
          doc.text(`₹${Number(item.price).toFixed(2)}`, 450, y);
          y += 20;
        }

        doc.rect(50, y + 10, 495, 1).fill("#e2e8f0");
        doc.fontSize(10).fillColor("#0F6E56").font("Helvetica-Bold").text("Grand Total:", 350, y + 25);
        doc.text(`₹${Number(order.totals.total).toFixed(2)}`, 450, y + 25);
        
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  },

  getInvoiceHtml(order: any): string {
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
  },

  getOfflineBillHtml(data: any): string {
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
};
