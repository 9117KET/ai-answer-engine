// TODO: Implement the chat API with Groq and web scraping with Cheerio and Puppeteer
// Refer to the Next.js Docs on how to read the Request body: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
// Refer to the Groq SDK here on how to use an LLM: https://www.npmjs.com/package/groq-sdk
// Refer to the Cheerio docs here on how to parse HTML: https://cheerio.js.org/docs/basics/loading
// Refer to Puppeteer docs here: https://pptr.dev/guides/what-is-puppeteer
import { NextResponse } from "next/server";
import { getGroqResponse } from "@/app/utils/groqClient";
import { scraperUrl, urlPattern } from "@/app/utils/scraper";

export async function POST(req: Request) {
  try {
    // Attempt to parse the JSON body of the incoming request
    const { message } = await req.json();

    // Validate the message
    if (!message) {
      throw new Error("Invalid message");
    }

    // Log a message to the console indicating a message was received
    console.log("Message received:", message);

    const url = message.match(urlPattern);
    if (url) {
      console.log("Url found", url);
      const scrapedContent = await scraperUrl(url);
      console.log("scraped content", scrapedContent)
    }
    // Get the response from the Groq client
    const response = await getGroqResponse(message);

    // Respond with a JSON object containing the received message
    return NextResponse.json({ message: response });
  } catch (error) {
    // Log the error with more details
    console.error("Error processing request:", error.message || error);

    // Respond with a more detailed error message
    return NextResponse.json({
      message: "Error processing request",
      error: error.message || "Unknown error",
    });
  }
}
