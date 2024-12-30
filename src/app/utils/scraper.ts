import axios from "axios";
import * as cheerio from "cheerio";
import { Logger } from "./logger";
import { Redis } from "@upstash/redis";

//import { headers } from "next/headers";

const logger = new Logger("scraper");

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
//Cache TTL in seconds (7 days)
const CACHE_TTL = 7 * (24 * 60 * 60);
const MAX_CACHE_SIZE = 1024000; //1MB limit for cached content

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
    // First check cache
    const cached = await getCachedContent(url);
    if (cached) {
      logger.info(`Returning cached content for: ${url}`);
      return cached;
    }

    // If not cached, proceed with scraping
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; YourBot/1.0)",
      },
    });
    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $("script").remove();
    $("style").remove();
    $("noscript").remove();

    // Extract content (existing code)
    const title = $("title").text();
    const metaDescription = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const h2 = $("h2")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
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
    const paragraphs = $("p")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");
    const listItems = $("li")
      .map((_, el) => $(el).text())
      .get()
      .join(" ");

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

    combinedContent = cleanText(combinedContent).slice(0, 40000);

    const scrapedContent: ScrapedContent = {
      url,
      title: cleanText(title),
      heading: {
        h1: cleanText(h1),
        h2: cleanText(h2),
      },
      metaDescription: cleanText(metaDescription),
      content: combinedContent,
      error: null,
      cachedAt: Date.now(),
    };

    // Cache the scraped content
    await cacheContent(url, scrapedContent);

    return scrapedContent;
  } catch (error: unknown) {
    logger.error(`Error scraping ${url}:`, error);
    return {
      url,
      title: "",
      heading: { h1: "", h2: "" },
      metaDescription: "",
      content: "",
      error: `Failed to scrape URL: ${error instanceof Error ? error.message : "Unknown error"}`,
      cachedAt: Date.now(),
    };
  }
}

export interface ScrapedContent {
  url: string;
  title: string;
  heading: {
    h1: string;
    h2: string;
  };
  metaDescription: string;
  content: string;
  error: string | null;
  cachedAt?: number;
}

//Function to get cache key for a URL with sanitization
function getCacheKey(url: string): string {
  const sanitizedUrl = url.substring(0, 200); //limit key length
  return `scrape:${sanitizedUrl}`;
}

//Function to get cached content with error handling
async function getCachedContent(url: string): Promise<ScrapedContent | null> {
  try {
    const cacheKey = getCacheKey(url);
    logger.info(`Checking cache for key: ${cacheKey}`);
    const cached = await redis.get(cacheKey);

    if (!cached || (typeof cached !== "string" && typeof cached !== "object")) {
      return null;
    }
    logger.info(`Cache hit - Found cached content for: ${url}`);

    //Handling both string and object response from Redis
    let parsed: ScrapedContent | null;
    if (typeof cached === "string") {
      try {
        parsed = JSON.parse(cached) as ScrapedContent;
      } catch (parseError) {
        logger.error(`JSON parse error for cached content: ${parseError}`);
        await redis.del(cacheKey);
        return null;
      }
    } else {
      parsed = cached as ScrapedContent;
    }

    if (isValidScrapedContent(parsed)) {
      const age = Date.now() - (parsed.cachedAt || 0);
      logger.info(`Cache content age: ${Math.round(age / 1000 / 60)} minutes`);
      return parsed;
    }

    logger.error("Invalid cached content format");
    await redis.del(cacheKey);
    return null;
  } catch (error) {
    logger.error(`Error retrieving cached content: ${error}`);
    return null;
  }
}

// Add missing interface validation function
function isValidScrapedContent(content: unknown): content is ScrapedContent {
  if (!content || typeof content !== "object") return false;
  const c = content as Partial<ScrapedContent>;
  return !!(
    typeof c.url === "string" &&
    typeof c.title === "string" &&
    typeof c.content === "string" &&
    c.heading !== undefined &&
    c.heading !== null &&
    typeof c.heading.h1 === "string" &&
    typeof c.heading.h2 === "string" &&
    typeof c.metaDescription === "string" &&
    (c.error === null || typeof c.error === "string")
  );
}

async function cacheContent(
  url: string,
  content: ScrapedContent
): Promise<void> {
  try {
    const cacheKey = getCacheKey(url);
    const contentToCache = {
      ...content,
      cachedAt: Date.now(),
    };

    // Check content size before caching
    const contentSize = Buffer.from(JSON.stringify(contentToCache)).length;
    if (contentSize > MAX_CACHE_SIZE) {
      logger.warn(`Content too large to cache (${contentSize} bytes)`);
      return;
    }

    await redis.set(cacheKey, JSON.stringify(contentToCache), {
      ex: CACHE_TTL,
    });
    logger.info(`Cached content for: ${url}`);
  } catch (error) {
    logger.error(`Error caching content: ${error}`);
  }
}
