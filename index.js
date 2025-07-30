import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fetchArticles from "./src/news/fetchArticles.js";
import summarize from "./src/utils/gemini.utils.js";

dotenv.config();


const app = express();
app.use(express.json());
app.use(cors());

app.post("/api/news-thread", async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: "Topic is required" });

  try {
    const articles = await fetchArticles(topic);

    const summaries = await Promise.all(
      articles.map(async article => {
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
