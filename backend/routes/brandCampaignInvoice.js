const express = require("express");
const PDFDocument = require("pdfkit");
const { requireAuth } = require("../middleware/auth");
const { prisma } = require("../lib/prisma");

const router = express.Router();

/**
 * GET /api/brand/campaigns/:id/invoice.pdf
 *
 * Generates a PDF invoice for a campaign (on-the-fly).
 * Uses existing Orders generated from campaign approvals:
 * - Order.orderType = "campaign"
 * - Order.campaignId = <campaignId>
 *
 * NOTE:
 * - Your Order.sellerId points to Seller.id
 * - Order.buyerId points to User.id (Brand)
 * - Listing contains title/price
 */
router.get("/:id/invoice.pdf", requireAuth, async (req, res) => {
  try {
    const brandId = req.user.id;
    const campaignId = String(req.params.id);

    // 1) Validate campaign belongs to brand
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, brandId },
      select: { id: true, name: true, createdAt: true },
    });
    if (!campaign) return res.status(404).json({ ok: false, error: "Campaign not found" });

    // 2) Brand info
    const brand = await prisma.user.findUnique({
      where: { id: brandId },
      select: { id: true, name: true, email: true },
    });

    // 3) Fetch campaign orders
    const orders = await prisma.order.findMany({
      where: {
        campaignId,
        orderType: "campaign",
      },
      orderBy: { createdAt: "asc" },
      include: {
        listing: { select: { id: true, title: true, price: true } },
        seller: {
          select: {
            id: true,
            userId: true,
            user: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });

    // If no orders yet, still generate a “zero invoice” (premium feel)
    const subtotal = orders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

    // 4) Pricing controls (configure later)
    const platformFeePct = 0; // set to 10 for 10% platform fee if you want
    const gstPct = 0; // set to 18 for GST later (India)

    const platformFee = Math.round((subtotal * platformFeePct) / 100);
    const taxable = subtotal + platformFee;
    const gst = Math.round((taxable * gstPct) / 100);
    const grandTotal = Math.round(taxable + gst);

    // 5) Invoice number (no DB required)
    const y = new Date().getFullYear();
    const m = String(new Date().getMonth() + 1).padStart(2, "0");
    const d = String(new Date().getDate()).padStart(2, "0");
    const shortId = campaignId.slice(-6).toUpperCase();
    const invoiceNo = `PH-${y}${m}${d}-${shortId}`;

    // Helpers
    const currencyINR = (v) => {
      try {
        return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v || 0);
      } catch {
        return `₹${Math.round(v || 0)}`;
      }
    };

    const fmtDate = (dt) => {
      try {
        return new Date(dt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
      } catch {
        return String(dt);
      }
    };

    // 6) Setup response headers for download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${invoiceNo}.pdf"`);

    // 7) Generate PDF
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    doc.pipe(res);

    // ====== HEADER ======
    doc.fontSize(18).font("Helvetica-Bold").text("PromoHubGo", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica").fillColor("#555").text("Campaign Invoice", { align: "left" });
    doc.fillColor("#000");

    doc.moveDown(0.8);

    // Right side meta
    const metaX = 340;
    const topY = doc.y - 40;

    doc.fontSize(10).font("Helvetica-Bold").text("Invoice No:", metaX, topY);
    doc.font("Helvetica").text(invoiceNo, metaX + 80, topY);

    doc.font("Helvetica-Bold").text("Invoice Date:", metaX, topY + 14);
    doc.font("Helvetica").text(fmtDate(new Date()), metaX + 80, topY + 14);

    doc.font("Helvetica-Bold").text("Campaign:", metaX, topY + 28);
    doc.font("Helvetica").text(campaign.name, metaX + 80, topY + 28, { width: 200 });

    doc.moveDown(1.2);

    // ====== BILL TO ======
    doc.fontSize(11).font("Helvetica-Bold").text("Bill To");
    doc.moveDown(0.2);
    doc.fontSize(10).font("Helvetica").fillColor("#333");
    doc.text(brand?.name || "Brand");
    if (brand?.email) doc.text(brand.email);
    doc.fillColor("#000");

    doc.moveDown(1.2);

    // ====== TABLE HEADER ======
    const startX = 48;
    const tableY = doc.y;
    const col = {
      item: startX,
      creator: startX + 210,
      qty: startX + 360,
      rate: startX + 410,
      total: startX + 490,
    };

    doc.fontSize(9).font("Helvetica-Bold");
    doc.text("Item", col.item, tableY);
    doc.text("Creator", col.creator, tableY);
    doc.text("Qty", col.qty, tableY);
    doc.text("Rate", col.rate, tableY);
    doc.text("Total", col.total, tableY);

    doc.moveTo(startX, tableY + 14).lineTo(545, tableY + 14).strokeColor("#ddd").stroke();
    doc.strokeColor("#000");

    doc.moveDown(0.8);

    // ====== TABLE ROWS ======
    doc.font("Helvetica").fontSize(9);
    let rowY = doc.y;

    if (!orders.length) {
      doc.fillColor("#666").text("No approved creator orders yet.", startX, rowY);
      doc.fillColor("#000");
      doc.moveDown(1.2);
    } else {
      for (const o of orders) {
        const itemTitle = o.listing?.title || "Creator Package";
        const creatorName = o.seller?.user?.name || o.seller?.user?.username || "Creator";
        const qty = 1;
        const rate = Number(o.totalPrice) || Number(o.listing?.price) || 0;
        const total = Number(o.totalPrice) || 0;

        // Page break protection
        if (doc.y > 720) {
          doc.addPage();
          rowY = doc.y;
        }

        doc.text(itemTitle, col.item, rowY, { width: 190 });
        doc.text(creatorName, col.creator, rowY, { width: 140 });
        doc.text(String(qty), col.qty, rowY);
        doc.text(currencyINR(rate), col.rate, rowY);
        doc.text(currencyINR(total), col.total, rowY);

        rowY = rowY + 18;
      }

      doc.moveDown(1.0);
    }

    // ====== TOTALS BOX ======
    const boxTop = doc.y + 8;
    const boxX = 340;

    doc.moveTo(boxX, boxTop).lineTo(545, boxTop).strokeColor("#eee").stroke();
    doc.strokeColor("#000");

    const line = (label, value) => {
      doc.font("Helvetica-Bold").text(label, boxX, doc.y + 10, { width: 120 });
      doc.font("Helvetica").text(value, boxX + 120, doc.y, { width: 85, align: "right" });
    };

    doc.moveDown(0.2);
    line("Subtotal", currencyINR(subtotal));
    if (platformFeePct > 0) line(`Platform Fee (${platformFeePct}%)`, currencyINR(platformFee));
    if (gstPct > 0) line(`GST (${gstPct}%)`, currencyINR(gst));
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").text("Grand Total", boxX, doc.y + 10, { width: 120 });
    doc.font("Helvetica-Bold").text(currencyINR(grandTotal), boxX + 120, doc.y, { width: 85, align: "right" });

    doc.moveDown(2.0);

    // ====== FOOTER ======
    doc.fontSize(9).font("Helvetica").fillColor("#666");
    doc.text("Notes:", startX);
    doc.text("• This invoice is generated for campaign collaboration orders created via PromoHubGo.", startX);
    doc.text("• Payment terms and deliverables are governed by the campaign agreement and order details.", startX);
    doc.fillColor("#000");

    doc.end();
  } catch (e) {
    console.error("GET /api/brand/campaigns/:id/invoice.pdf ERROR:", e);
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

module.exports = router;
