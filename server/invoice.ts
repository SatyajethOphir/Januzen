import PDFDocument from "pdfkit";
import https from "https";
import fs from "fs";
import path from "path";
import { Order } from "../src/types";

function fetchLogo(): Promise<Buffer | null> {
  return new Promise((resolve) => {
    try {
      // 1. Try local logo.png first (proper landscape/wide logo)
      const localLogoPath = path.join(process.cwd(), "public", "logo.png");
      if (fs.existsSync(localLogoPath)) {
        resolve(fs.readFileSync(localLogoPath));
        return;
      }

      // 2. Try local appicon.png next
      const localAppIconPath = path.join(process.cwd(), "public", "appicon.png");
      if (fs.existsSync(localAppIconPath)) {
        resolve(fs.readFileSync(localAppIconPath));
        return;
      }
    } catch (e) {
      // Local image read failed
    }

    // 3. Fallback to HTTPS fetch
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
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
  });
}

export async function generateInvoice(order: Order, outputPath?: string): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Fetch logo asynchronously
      const logoBuffer = await fetchLogo();

      // Top banner or logo header
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 50, 45, { width: 50 });
          doc.fontSize(18).fillColor("#0F6E56").font("Helvetica-Bold").text("JANUZEN Global LLP", 115, 45);
        } catch (err) {
          doc.fontSize(18).fillColor("#0F6E56").font("Helvetica-Bold").text("JANUZEN Global LLP", 50, 45);
        }
      } else {
        doc.fontSize(18).fillColor("#0F6E56").font("Helvetica-Bold").text("JANUZEN Global LLP", 50, 45);
      }

      // Address & metadata
      const startTextX = logoBuffer ? 115 : 50;
      doc.fontSize(8).fillColor("#475569").font("Helvetica")
         .text("Gajularamaram, Hyderabad, Telangana", startTextX, 63)
         .text("Email: team@januzen.in | Phone: +91-9666588553", startTextX, 75);

      // Title & GSTIN
      const invoiceType = process.env.INVOICE_TYPE === "bill_of_supply" ? "BILL OF SUPPLY" : "TAX INVOICE";
      const gstin = process.env.GSTIN || "Pending Registration";
      doc.fontSize(16).fillColor("#0F6E56").font("Helvetica-Bold").text(invoiceType, 350, 45, { align: "right", width: 195 });
      doc.fontSize(8).fillColor("#64748b").font("Helvetica").text(`GSTIN: ${gstin}`, 350, 65, { align: "right", width: 195 });

      // Horizontal separator line
      doc.rect(50, 95, 495, 2).fill("#0F6E56");

      // Bill To Column
      doc.fontSize(10).fillColor("#0F6E56").font("Helvetica-Bold").text("BILL TO:", 50, 115);
      doc.fontSize(10).fillColor("#0F172A").font("Helvetica-Bold").text(order.userName, 50, 130);
      
      const sa = order.shippingAddress;
      const addressText = sa && typeof sa === "object"
        ? `${sa.addressLine || ""}\n${sa.city || ""} - ${sa.postalCode || ""}\nPhone: ${sa.phone || ""}`
        : String(order.shippingAddress || "");

      doc.fontSize(8).fillColor("#475569").font("Helvetica")
         .text(order.userEmail, 50, 145)
         .text(addressText, 50, 157, { width: 230 });

      // Invoice Details Column
      doc.fontSize(10).fillColor("#0F6E56").font("Helvetica-Bold").text("INVOICE DETAILS:", 315, 115);
      doc.fontSize(8).fillColor("#475569").font("Helvetica");

      doc.font("Helvetica-Bold").text("Invoice No:", 315, 130).font("Helvetica").text(order.orderId, 395, 130);

      const dateStr = new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      doc.font("Helvetica-Bold").text("Date:", 315, 145).font("Helvetica").text(dateStr, 395, 145);

      doc.font("Helvetica-Bold").text("Payment:", 315, 160).font("Helvetica").text(order.paymentMethod || "Cash on Delivery", 395, 160);

      // Line items table
      const tableTopY = 210;
      doc.rect(50, tableTopY, 495, 20).fill("#0F6E56");

      // Write table headers
      doc.fontSize(8).fillColor("#FFFFFF").font("Helvetica-Bold");
      doc.text("#", 50, tableTopY + 6, { width: 30 });
      doc.text("Item Description", 80, tableTopY + 6, { width: 180 });
      doc.text("Business Unit", 260, tableTopY + 6, { width: 100 });
      doc.text("Qty", 360, tableTopY + 6, { width: 35, align: "center" });
      doc.text("Unit Price", 395, tableTopY + 6, { width: 75, align: "right" });
      doc.text("Amount", 470, tableTopY + 6, { width: 75, align: "right" });

      let currentY = tableTopY + 20;
      order.items.forEach((item: any, index: number) => {
        // Alternate row backgrounds
        if (index % 2 === 1) {
          doc.rect(50, currentY, 495, 22).fill("#F8FAFC");
        } else {
          doc.rect(50, currentY, 495, 22).fill("#FFFFFF");
        }

        doc.fontSize(8).fillColor("#1E293B").font("Helvetica");
        doc.text(String(index + 1), 50, currentY + 7, { width: 30 });
        doc.text(item.name, 80, currentY + 7, { width: 180, height: 15, ellipsis: true });
        
        const shopLabel = item.shop === "medicals" ? "Nuthan Medicals" : "JA Stationery";
        doc.text(shopLabel, 260, currentY + 7, { width: 100 });
        
        doc.text(String(item.quantity), 360, currentY + 7, { width: 35, align: "center" });
        doc.text(`Rs. ${Number(item.price).toFixed(2)}`, 395, currentY + 7, { width: 75, align: "right" });
        
        const amount = item.price * item.quantity;
        doc.text(`Rs. ${amount.toFixed(2)}`, 470, currentY + 7, { width: 75, align: "right" });

        currentY += 22;
      });

      // Bottom separator border for table
      doc.moveTo(50, currentY).lineTo(545, currentY).lineWidth(0.5).stroke("#CBD5E1");
      currentY += 10;

      const totals = order.totals;
      const writeTotalLine = (label: string, valueStr: string, isBold = false) => {
        doc.fontSize(8).fillColor(isBold ? "#0F6E56" : "#475569").font(isBold ? "Helvetica-Bold" : "Helvetica");
        doc.text(label, 350, currentY, { width: 100, align: "right" });
        doc.fontSize(8).fillColor(isBold ? "#0F6E56" : "#1E293B").font(isBold ? "Helvetica-Bold" : "Helvetica");
        doc.text(valueStr, 470, currentY, { width: 75, align: "right" });
        currentY += 15;
      };

      writeTotalLine("Subtotal:", `Rs. ${Number(totals.subtotal).toFixed(2)}`);

      if (totals.discount > 0) {
        writeTotalLine("Discount:", `-Rs. ${Number(totals.discount).toFixed(2)}`);
      }

      const shippingStr = totals.shipping === 0 ? "FREE" : `Rs. ${Number(totals.shipping).toFixed(2)}`;
      writeTotalLine("Shipping:", shippingStr);

      const isGstinSet = !!process.env.GSTIN;
      if (isGstinSet) {
        const halfTax = totals.tax / 2;
        writeTotalLine("CGST (2.5%):", `Rs. ${halfTax.toFixed(2)}`);
        writeTotalLine("SGST (2.5%):", `Rs. ${halfTax.toFixed(2)}`);
      } else {
        writeTotalLine("Tax (5%):", `Rs. ${Number(totals.tax).toFixed(2)}`);
      }

      doc.moveTo(350, currentY).lineTo(545, currentY).lineWidth(0.5).stroke("#CBD5E1");
      currentY += 5;

      writeTotalLine("TOTAL:", `Rs. ${Number(totals.total).toFixed(2)}`, true);

      // Simple footer at bottom
      doc.rect(50, 750, 495, 0.5).fill("#CBD5E1");
      doc.fontSize(8).fillColor("#64748b").font("Helvetica").text("Thank you for your order! For support: team@januzen.in", 50, 760, { align: "center", width: 495 });
      doc.fontSize(7).fillColor("#94A3B8").font("Helvetica").text("This is a computer-generated invoice.", 50, 772, { align: "center", width: 495 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function generateOfflineBill(data: {
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  shopDivision: "medicals" | "stationery" | "mixed";
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  totals: { subtotal: number; tax: number; total: number };
  belowMinimum: boolean;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const paperWidthMm = parseInt(process.env.THERMAL_PAPER_WIDTH || "80", 10);
      const paperWidthPt = paperWidthMm * 2.8346; // mm to points
      const margin = 8;
      
      // Calculate dynamic page height to avoid empty trailing space on thermal rolls
      // Height budget: ~160pt header/meta, ~15/20pt per item, ~120pt totals/footer, margin
      const itemRowHeight = paperWidthMm === 58 ? 16 : 14;
      const calculatedHeight = 160 + (data.items.length * itemRowHeight) + 120 + (data.belowMinimum ? 15 : 0) + (margin * 2);
      
      const doc = new PDFDocument({
        size: [paperWidthPt, calculatedHeight],
        margins: { top: margin, bottom: margin, left: margin, right: margin },
        bufferPages: true,
        font: "Courier"
      });
      
      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const charWidth = paperWidthMm === 58 ? 30 : 40;
      
      const fillChar = (char: string, count: number) => char.repeat(count);
      const divider = fillChar("-", charWidth);
      const doubleDivider = fillChar("=", charWidth);
      
      function formatLine(left: string, right: string): string {
        const leftSpace = charWidth - right.length;
        if (left.length > leftSpace - 1) {
          return left.substring(0, leftSpace - 3) + ".." + " " + right;
        } else {
          const spaces = " ".repeat(leftSpace - left.length);
          return left + spaces + right;
        }
      }

      function formatThreeCols(col1: string, col2: string, col3: string, w1: number, w2: number, w3: number): string {
        let c1 = col1;
        if (c1.length > w1) {
          c1 = c1.substring(0, w1 - 3) + "...";
        } else {
          c1 = c1 + " ".repeat(w1 - c1.length);
        }
        
        let c2 = col2;
        if (c2.length < w2) {
          c2 = " ".repeat(w2 - c2.length) + c2;
        }
        
        let c3 = col3;
        if (c3.length < w3) {
          c3 = " ".repeat(w3 - c3.length) + c3;
        }
        
        return c1 + c2 + c3;
      }

      function centerText(text: string): string {
        if (text.length >= charWidth) return text.substring(0, charWidth);
        const leftSpace = Math.floor((charWidth - text.length) / 2);
        return " ".repeat(leftSpace) + text;
      }

      // Title & Header details
      doc.fontSize(8).fillColor("#000000");
      doc.text(doubleDivider);
      doc.text(centerText("JANUZEN GLOBAL LLP"));
      
      let divisionLabel = "Nuthan Meds & JA Stationery";
      if (data.shopDivision === "medicals") {
        divisionLabel = "Nuthan Medicals";
      } else if (data.shopDivision === "stationery") {
        divisionLabel = "JA Stationery";
      }
      doc.text(centerText(divisionLabel));
      doc.text(centerText("Gajularamaram, Hyderabad, TS"));
      doc.text(centerText("Ph: +91-9666588553"));
      doc.text(centerText("team@januzen.in | januzen.in"));
      doc.text(doubleDivider);
      
      // Receipt Meta
      doc.text(centerText("CASH RECEIPT"));
      doc.text(`Bill No: ${data.billNumber}`);
      
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
      doc.text(`Date: ${dateStr}  Time: ${timeStr}`);
      
      const custName = data.customerName || "Walk-in Customer";
      const custPhoneSuffix = data.customerPhone ? ` (${data.customerPhone})` : "";
      doc.text(`Customer: ${custName}${custPhoneSuffix}`);
      doc.text(doubleDivider);

      // Line items table header
      if (paperWidthMm === 58) {
        doc.text(formatLine("Item Name", "Qty Amount"));
      } else {
        doc.text(formatThreeCols("Item Name", "Qty", "Amount", 22, 6, 12));
      }
      doc.text(divider);

      // Line items rows
      data.items.forEach((item) => {
        const itemTotalStr = `Rs.${(item.quantity * item.unitPrice).toFixed(2)}`;
        if (paperWidthMm === 58) {
          doc.text(formatLine(item.name, `${item.quantity} ${itemTotalStr}`));
        } else {
          doc.text(formatThreeCols(item.name, item.quantity.toString(), itemTotalStr, 22, 6, 12));
        }
      });
      doc.text(divider);

      // Totals
      doc.text(formatLine("Subtotal:", `Rs.${data.totals.subtotal.toFixed(2)}`));
      doc.text(formatLine("Tax (5% GST):", `Rs.${data.totals.tax.toFixed(2)}`));
      doc.text(doubleDivider);
      doc.text(formatLine("TOTAL:", `Rs.${data.totals.total.toFixed(2)}`));
      doc.text(doubleDivider);

      // Below threshold warning
      if (data.belowMinimum) {
        doc.text("* Below Rs.750 threshold");
      }

      // Footer
      doc.text("\nPayment: Cash / UPI");
      doc.text("\nSignature: _______________");
      doc.text("\n" + centerText("Thank you for visiting JANUZEN!"));
      doc.text(centerText("** januzen.in **"));
      doc.text(centerText("--- Computer generated bill ---"));

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function getInvoiceHtml(order: any): string {
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

export function getOfflineBillHtml(data: any): string {
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
