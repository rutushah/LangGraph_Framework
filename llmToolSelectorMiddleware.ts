import { createAgent, llmToolSelectorMiddleware, modelFallbackMiddleware, summarizationMiddleware, tool } from "langchain";
import z from "zod";
import "dotenv/config";

//creation of search tool
const searchTool = tool(({query}) => {
    return `Search results for "${query}" : Found 5 articles are retrieved from the internet.`;
},
{
    name: "search",
    description: "Search the internet for information",
    schema: z.object({
        query: z.string()
    })
}
)

// tool to send email
const emailTool = tool(({recipient, subject}) => {
    return `Email sent to ${recipient} with subject "${subject}".`;
},{
    name: "sendEmail",
    description: "Send an email to specified recipient",
    schema: z.object({
        recipient: z.string().email(),
        subject: z.string(),
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

// to save the cost of ai we can use summarizationMiddleware()
//agent creation
const agent = createAgent ({
    model: "gpt-4o",
    tools: [searchTool, emailTool, getWeather],
    middleware: [
        modelFallbackMiddleware("gpt-4o-mini", "gpt-3.5-turbo"),
        summarizationMiddleware({   
            model: "gpt-4o",
            maxTokensBeforeSummary: 8000, //trigger summarization of 8000 tokens
            messagesToKeep: 20 //keep the last 20 messages in the conversation history
        }),

        //eg if you have 50 tools, use some base model to filter the
        // top 3-4 tools as per the user prompt and then handover to main model
        llmToolSelectorMiddleware({
            model: "gpt-4o-mini",
            maxTools: 2
        })
    ]
})

const response = await agent.invoke({
    messages:[{role: "user", content: "What is the weather in Dallas? and email me to rutus@test.com with subject Weather details"
    }]
})

console.log(response)