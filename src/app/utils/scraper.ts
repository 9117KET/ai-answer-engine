import axios from "axios";
import * as cheerio from "cheerio";
import { headers } from "next/headers";

// Regular expression pattern to validate URLs
export const urlPattern =
  /^(https?:\/\/)?([\w\-]+\.)+[a-z]{2,6}(:\d+)?(\/.*)?$/i;

// Function to clean text content by removing extra spaces and newlines
function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();
}

// Function to scrape content from a given URL
export async function scraperUrl(url: string) {
  try {
    // Fetch the HTML content of the URL
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Log the response data for debugging
    console.log("response.data", response.data);
    console.log(response);

    // Remove unwanted elements like script, style, and noscript tags
    $("script").remove();
    $("style").remove();
    $("noscript").remove();

    // Extract the title and meta description
    const title = $("title").text();
    const metaDescription = $('meta[name="description"]').attr("content") || "";

    // Extract text from h1 and h2 tags
    const h1 = $("h1")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const h2 = $("h2")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");

    // Extract text from important elements like article, main, and content
    const articleText = $("article")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const mainText = $("main")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const contentText = $('.content, #content, [class*="content"]')
      .map((_, el) => $(el).text())
      .get()
      .join(" ");

    // Extract all paragraph text
    const paragraphs = $("p")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");

    // Extract text from list items
    const listItems = $("li")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");

    // Combine all extracted content into a single string
    let combinedContent = [
      title,
      metaDescription,
      h1,
      h2,
      articleText,
      mainText,
      contentText,
      paragraphs,
      listItems,
    ].join(" ");

    // Clean and truncate the combined content to a maximum length
    combinedContent = cleanText(combinedContent).slice(0, 40000);

    // Return the structured data
    return {
      url,
      title: cleanText(title),
      headings: {
        h1: cleanText(h1),
        h2: cleanText(h2),
      },
      metaDescription: cleanText(metaDescription),
      content: combinedContent,
      error: null,
    };
  } catch (error) {
    // Log the error and return an error object
    console.error(`Error scraping ${url}:`, error);
    return {
      url,
      title: "",
      headings: { h1: "", h2: "" },
      metaDescription: "",
      content: "",
      error: "Failed to scrape URL",
    };
  }
}
