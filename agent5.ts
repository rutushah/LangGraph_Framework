// to preserve the memory management

import { createAgent, createMiddleware, initChatModel, tool } from "langchain";
import "dotenv/config";
import z from "zod";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { HumanMessage } from "@langchain/core/messages";

const systemPrompt = `You are an expert weather forecaster who also speaks in a humour way.
You have access to two tools:
- getWeather: use this to get the weather for a specific location
- getUserLocation: use this to get the user's location
If a user asks you for the weather, make sure you know the location first. If you can tell from the question that they mean wherever they are, use the getUserLocation tool to find their location.`;

// tool to get the user location
// ✅ FIX 1: access user_id from config.configurable, not config.context
const getUserLocation = tool(
  (_, config) => {
    const user_id = config.configurable?.user_id;
    // in a real application developer will fetch the location based on userid from db or through api
    return user_id === "1" ? "Florida" : "SFO";
  },
  {
    name: "getUserLocation",
    description: "Retrieve user information based on user Id",
    schema: z.object({}),
  }
);

// tool to get the weather based on the city
const getWeather = tool(
  (input) => {
    return `Its sunny in ${input.city} today.`;
  },
  {
    name: "getWeather",
    description: "Get the weather for a given city",
    schema: z.object({
      city: z.string(),
    }),
  }
);

// if message count is less than 3 -> cheaperModel, else use advanced models like claude-sonnet
const model = await initChatModel("claude-sonnet-4-6", {
  temperature: 0.7,
  timeout: 30,
  max_tokens: 1000,
});

const basicModel = new ChatOpenAI({
  model: "gpt-4o-mini",
});

// ✅ FIX 2: Don't pass model override to handler — call the chosen model directly
const dynamicModelSelection = createMiddleware({
  name: "DynamicModelSelection",
  wrapModelCall: async (request, handler) => {
    // count only user messages
    const userMessageCount = request.messages.filter(
      (m) => (m as any).getType?.() === "human" || (m as any).role === "user"
    ).length;

    console.log(
      `userMessageCount=${userMessageCount}, selectedModel=${
        userMessageCount > 3 ? "claude-sonnet-4-6" : "gpt-4o-mini"
      }`
    );

    if (userMessageCount > 3) {
      // Use the default handler (which uses claude-sonnet-4-6 from createAgent)
      return handler(request);
    } else {
      // Invoke the cheaper model directly and return its AIMessage
      const response = await basicModel
        .bindTools(request.tools ?? [])
        .invoke(request.messages) as AIMessage;
      return response;
    }
  },
});

// ✅ FIX 3: Move user_id into configurable, not a separate context key
const config = {
  configurable: { thread_id: "1", user_id: "1" },
};

const qaConfig = {
  configurable: { thread_id: "2", user_id: "3" },
};

const responseFormat = z.object({
  humour_response: z.string(),
  weather_condition: z.string(),
});

const checkpointer = new MemorySaver();

const agent = createAgent({
  model: model,
  tools: [getUserLocation, getWeather],
  systemPrompt,
  responseFormat,
  checkpointer,
  middleware: [dynamicModelSelection],
});





// const response = await agent.invoke(
//   { messages: [new HumanMessage("What is weather outside")] as BaseMessage[] },
//   config
// );

// const response1 = await agent.invoke(
//   { messages: [new HumanMessage("What Location did you just tell me about?")] as BaseMessage[] },
//   config
// );

// const response2 = await agent.invoke(
//   { messages: [new HumanMessage("Suggest me good places in that location")] as BaseMessage[] },
//   config
// );

// const response3 = await agent.invoke(
//   { messages: [new HumanMessage("Suggest me good places in that location")] as BaseMessage[] },
//   config
// );

// console.log(response3.structuredResponse);