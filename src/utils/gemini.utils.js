import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const summarize = async ({ title, url, source, description, date, author }) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
Summarize the following news article in a Twitter thread format.
Always show the latest article or news and name of the author
Use 2–4 concise tweet-style points.

🧵 ${title} (Source: ${source})
Link: ${url}
Date: ${date}
Author: ${author}

${description}
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  return { summary: text };
};

export default summarize;
