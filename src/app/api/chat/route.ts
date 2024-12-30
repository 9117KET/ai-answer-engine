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
    // Add API key validation at the start
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY environment variable is not configured");
    }

    // Attempt to parse the JSON body of the incoming request
    const { message } = await req.json();

    // Validate the message
    if (!message) {
      throw new Error("Invalid message");
    }

    // Log a message to the console indicating a message was received
    console.log("Message received:", message);

    // Declare scrapedContent variable at the start
    let scrapedContent = ""; // Initialize with empty string

    const url = message.match(urlPattern);
    if (url) {
      console.log("Url found", url);
      const scraperResponse = await scraperUrl(url);
      console.log("scraper response:", scraperResponse);
      scrapedContent = scraperResponse.content;
      console.log("scraped content:", scrapedContent);
    }

    //Extracting the user's query by removing the url if present
    const userQuery = message.replace(url ? url[0] : "", "").trim();

    const prompt = `
You are an academic expert assistant. Your task is to answer questions based on the provided content.

Context:
${scrapedContent}

Question: "${userQuery}"

Please format your response following these guidelines:
1. Start with a clear, direct answer
2. Support your answer with specific evidence from the provided context
3. Use markdown formatting for better readability:
   - Use headers (##) for sections
   - Use bullet points where appropriate
   - Use bold for emphasis
   - Quote relevant text using > blockquotes
4. If the context doesn't contain enough information to answer the question fully, clearly state this
5. Always cite specific parts of the context when making claims

Response format:
## Answer
[Direct answer to the question]

## Supporting Evidence
[Evidence from the context with quotes]

## Additional Context
[Any relevant additional information or caveats]
`;

    console.log("prompt:", prompt);

    // Get the response from the Groq client
    const response = await getGroqResponse(message);

    // Respond with a JSON object containing the received message
    return NextResponse.json({ message: response });
  } catch (error: unknown) {
    // Log the error with more details
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error processing request:", errorMessage);

    // Respond with a more detailed error message
    return NextResponse.json(
      {
        message: "Error processing request",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
