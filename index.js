import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { PDFDocument, rgb } from "pdf-lib";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fontkit = require("fontkit");import fetchArticles from "./src/news/fetchArticles.js";
import summarize from "./src/utils/gemini.utils.js";

dotenv.config();

// For ES modules path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// =========================
// 1. NEWS THREAD ROUTE
// =========================
app.post("/api/news-thread", async (req, res) => {
  const { topic } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Topic is required" });
  }

  try {
    const articles = await fetchArticles(topic);

    const summaries = await Promise.all(
      articles.map(async (article) => {
        const { summary } = await summarize(article);
        return {
          title: article.title,
          source: article.source,
          url: article.url,
          summary,
          date: article.date,
          author: article.author || "Unknown",
        };
      })
    );

    res.json({ success: true, summaries });
  } catch (err) {
    console.error("Error summarizing news:", err);
    res.status(500).json({ error: "Failed to generate news summaries" });
  }
});

// =========================
// 2. DOWNLOAD PDF ROUTE
// =========================
function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(" ");
  let lines = [];
  let currentLine = "";

  for (let word of words) {
    const testLine = currentLine ? currentLine + " " + word : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

app.post("/api/download-pdf", async (req, res) => {
  try {
    const { articles } = req.body;
    if (!articles || articles.length === 0) {
      return res.status(400).json({ error: "No articles provided for PDF generation." });
    }

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontPath = path.join(process.cwd(), "fonts", "NotoSans-Regular.ttf");
    const fontBytes = fs.readFileSync(fontPath);
    const customFont = await pdfDoc.embedFont(fontBytes);

    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    let y = height - 50;

    const margin = 50;
    const lineHeight = 14;
    const contentWidth = width - margin * 2;
    const padding = 20;

    for (const article of articles) {
      const addLines = (text, size, color) => {
        const lines = wrapText(text, customFont, size, contentWidth);
        for (const line of lines) {
          if (y < margin + lineHeight) {
            page = pdfDoc.addPage();
            y = page.getHeight() - 50;
          }
          page.drawText(line, { x: margin, y, size, font: customFont, color });
          y -= lineHeight;
        }
      };

      // Title
      addLines(article.title, 16, rgb(0, 0, 0));
      y -= 5;

      // Meta info
      addLines(`Source: ${article.source} | Date: ${new Date(article.date).toLocaleDateString()}`, 10, rgb(0.2, 0.2, 0.2));
      addLines(`Author: ${article.author}`, 10, rgb(0.2, 0.2, 0.2));
      addLines(`Link: ${article.url}`, 10, rgb(0, 0.5, 1));
      y -= 5;

      // Summary
      addLines(article.summary, 12, rgb(0, 0, 0));

      y -= padding;
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=news-threads.pdf");
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
