import { GoogleGenerativeAI } from "@google/generative-ai";
import { JSDOM } from "jsdom";
export const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  // Define time intervals in seconds
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };

  // Handle future dates
  if (seconds < 0) {
    return "just now";
  }

  // Find the appropriate interval
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);

    if (interval >= 1) {
      // Special case for just now
      if (unit === "second" && interval < 30) {
        return "just now";
      }

      // Return plural or singular form
      return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`;
    }
  }

  return "just now";
};

const extractTextFromHtml = (htmlContent) => {
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  // Remove image placeholders and hr tags
  document.querySelectorAll("hr, img").forEach((el) => el.remove());

  // Get text content
  return document.body.textContent
      .trim()
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/!\[.*?\]/g, ""); // Remove markdown image syntax
};

const createBlogContextPrompt = (htmlContent) => {
  const cleanContent = extractTextFromHtml(htmlContent);
  
  return `
Analyze the following blog content and provide:
1. A concise 3-line summary capturing the main message

Keep the format exactly as follows:
SUMMARY:
[3 lines of summary]

Blog Content:
${cleanContent}
`;
};

const generateBlogContext = async (content) => {
  if (!content) {
      throw new Error("Blog content is required");
  }

  try {
      // Initialize the AI model
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVEAI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

      // Generate and send prompt
      const prompt = createBlogContextPrompt(content);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the response
      const summarySection = text.split('\n\n').find(section => 
          section.startsWith('SUMMARY:')
      );

      if (!summarySection) {
          throw new Error("Failed to generate summary from AI response");
      }

      // Extract and clean the summary
      const summary = summarySection
          .replace('SUMMARY:', '')
          .trim()
          .split('\n')
          .filter(line => line.length > 0)
          .join('\n');

      return summary
  } catch (error) {
      console.error("AI Context Generation Error:", error);
      return {
          success: false,
          error: error.message || "Failed to generate context",
          metadata: {
              errorCode: error.code,
              errorDetails: error.details
          }
      };
  }
};

export { generateBlogContext };
