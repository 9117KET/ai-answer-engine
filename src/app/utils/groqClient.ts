import Groq from "groq-sdk"

// Initialize a new Groq client with an API key from environment variables
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Define an interface for chat messages with specific roles
interface ChatMessage{
    role: "system" | "user" | "assistant";
    content: string;
}

// Asynchronous function to get a response from the Groq API
export async function getGroqResponse(message: string){
    // Create an array of messages, starting with a system message
    const messages: ChatMessage[] = [
        {role: "system", content: "You are an academic expert. Always cite your sources and base your responses strictly on the provided context."},
        {role: "user", content: message }, 
    ];

    // Send a request to the Groq API to generate a chat completion
    const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant", 
        messages,
    })
    console.log("Received groq api request", response)

    // Return the content of the first choice from the response
    return response.choices[0].message.content;
}