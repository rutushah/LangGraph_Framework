//to preserve the memory management

import { createAgent, createMiddleware, initChatModel, tool } from "langchain";
import "dotenv/config";
import z from "zod";
import { MemorySaver } from "@langchain/langgraph";
import {ChatOpenAI} from "@langchain/openai"

const systemPrompt = `You are an expert weather forecaster who also speaks in humour way.
You have access to two tools:
- getWeather: use this to get the weather for a specific location
- getUserLocation: use this to get the user's location
If a user asks you for the weather, make sure you know the location first. If you can tell from the question that they mean wherever they are, use the getUserLocation tool to find their location.`;

//tool to get the userlocation
const getUserLocation = tool((_,config)=> {
    const user_id = config.context.user_id;
    //in a real application developer will fetch the location based on userid from db or through api
    return user_id === "1" ?  "Florida" : "SFO";
}, {
    name: "getUserLocation",
    description: "Retrieve user information based on user Id",
    schema: z.object({
        // user_id: z.string()
    })
})

//tool to get the weather based on the city
const getWeather =  tool((input) =>{
    //by getting
    return  `Its sunny in ${input.city} today.`
},
{
    name:"getWeather",
    description:"Get the weather for a given city",
    schema: z.object({
        city:z.string()
    })
}
);

// if message count is less than 3 -> cheaperModel, Else use the advance models like claude-sonnet
const model = await initChatModel("claude-sonnet-4-6", {
    temperature: 0.7, timeout:30, max_tokens: 1000
})

const basicModel = new ChatOpenAI({
    model: "gpt-4o-mini"
})


const dynamicModelSelection = createMiddleware({
    name: "DynamicModelSelection",
    wrapModelCall: (request, handler) => {

        // count only user messages
        const userMessageCount = request.messages.filter(
            m => (m as any).role === "user"
        ).length;

        const selectedModel = userMessageCount > 3 ? model : basicModel;

        console.log(
            `userMessageCount=${userMessageCount}, selectedModel=${
              userMessageCount > 3 ? "claude-sonnet-4-6" : "gpt-4o-mini"
            }`
          );

        return handler({
            ...request,
            model: selectedModel   
        });
    }
})

//userid of the logged in user from database and citty of that user from details stored
const config = {
    configurable: {thread_id: "1"},
    context: {user_id: "1"},
    db:{}
}
const qaConfig = {
    configurable: {thread_id: "2"},
    context: {user_id: "3"},
    db:{}
}

//response trained
const responseFormat = z.object({
    humour_response : z.string(),
    weather_condition : z.string()
})

//model format 



const checkpointer = new MemorySaver();


const agent = createAgent({
    model:model,
    tools:[getUserLocation, getWeather],
    systemPrompt,
    responseFormat, checkpointer,
    middleware:[dynamicModelSelection] as const
})

const response = await agent.invoke({
    messages:[{role:"user", content: "What is weather outside"}]
}, config)



const response1 = await agent.invoke({
    messages:[{role:"user", content: "What Location did you just tell me about?"}]
}, config)


const response2 = await agent.invoke({
    messages:[{role:"user", content: "Suggest me good places in that location"}]
}, config)


const response3 = await agent.invoke({
    messages:[{role:"user", content: "Suggest me good places in that location"}]
// }, qaConfig)
}, config)

console.log(response3.structuredResponse);