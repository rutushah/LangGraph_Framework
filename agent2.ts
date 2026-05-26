
import { createAgent, tool } from "langchain";
import "dotenv/config";
import z from "zod";

const systemPrompt = `You are an expert weather forecaster.
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

//userid of the logged in user from database and citty of that user from details stored
const config = {
    context: {user_id: "1"},
    db:{}
}
const qaConfig = {
    context: {user_id: "1"},
    db:{}
}

const agent = createAgent({
    model:"claude-sonnet-4-6",
    tools:[getUserLocation, getWeather],
    systemPrompt
})

const response = await agent.invoke({
    messages:[{role:"user", content: "What is weather outside"}]
}, qaConfig)

console.log(response);