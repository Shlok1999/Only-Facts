import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const fetchArticles = async (topic) => {
  const url = `${process.env.GNEWS_API}?q=${encodeURIComponent(topic)}&max=10&lang=en&apikey=${process.env.GNEWS_API_KEY}`;
  const res = await axios.get(url);

  return res.data.articles.map(article => ({
    title: article.title,
    url: article.url,
    source: article.source.name,
    description: article.description || "",
    date: article.publishedAt,
    author: article.author || "Unknown",
  }));
};

export default fetchArticles;
