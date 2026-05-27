import { createAgent, llmToolSelectorMiddleware, modelFallbackMiddleware, summarizationMiddleware, tool } from "langchain";
import z from "zod";
import "dotenv/config";
import { HumanMessage } from "@langchain/core/messages";

const SYSTEM_PROMPT = "You are a helpful assistant that searches on internet, sends email and also tells weather based on the user query.";

// Search tool
const searchTool = tool(({ query }) => {
    return `Search results for "${query}": Found 5 articles retrieved from the internet.`;
}, {
    name: "search",
    description: "Search the internet for information",
    schema: z.object({
        query: z.string()
    })
});

// Email tool
const emailTool = tool(({ recipient, subject }) => {
    return `Email sent to ${recipient} with subject "${subject}".`;
}, {
    name: "sendEmail",
    description: "Send an email to a specified recipient",
    schema: z.object({
        recipient: z.string().email(),
        subject: z.string(),
    })
});

// Weather tool
const getWeather = tool((input) => {
    return `It's sunny in ${input.city} today.`;
}, {
    name: "getWeather",
    description: "Get the weather for a given city",
    schema: z.object({
        city: z.string()
    })
});

// Agent creation
const agent = createAgent({
    model: "gpt-4o",
    systemPrompt: SYSTEM_PROMPT,        
    tools: [searchTool, emailTool, getWeather],
    middleware: [
        modelFallbackMiddleware("gpt-4o-mini", "gpt-3.5-turbo"),
        summarizationMiddleware({
            model: "gpt-4o",
            maxTokensBeforeSummary: 8000,
            messagesToKeep: 20
        }),
        llmToolSelectorMiddleware({
            model: "gpt-4o-mini",
            maxTools: 2             
        })
    ]
});

const userInput = "What is the weather in Dallas? and email me to rutus@test.com with subject Weather details";


const response = await agent.invoke({
    messages: [new HumanMessage(userInput)]
});

console.log(response);