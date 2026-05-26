// to create agent in langchain framework, we need to import createAgent from language and call the createAgent class
//zod is a typescript schema validation library that allows you to define and validate data structures in a type-safe way. 

import { createAgent, tool } from "langchain";
import "dotenv/config";
import z from "zod";

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

const getTime = tool( (input)=>{
    return `The current time in ${input.city} is 3:00PM.`
    }, 
    {
        name: "getTime",
        description: "Get the current time for a given city",
        schema: z.object({
            city: z.string()
        })
    }
)

// to this agent first we need to give the brain
const agent = createAgent({
    model:"claude-sonnet-4-6",
    // tools:[getWeather]
    tools:[getWeather,getTime]

});

const response = await agent.invoke({
    // messages: [{ role:"user",content:"What is weather in Newyork?"}]
    // messages: [{role:"user", content:"What is the current time in NewYork?"}]
    messages: [{role:"user", content:"What is weather and time in NewYork?"}]
    
})
console.log(response)
// const longMessage = response.messages[response.messages.length-1].content
// console.log(longMessage)