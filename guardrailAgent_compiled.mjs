import { createAgent, piiMiddleware } from "langchain";
import "dotenv/config";
function detectSSN(content) {
  const matches = [];
  const pattern = /\d{3}-\d{2}-\d{4}/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const ssn = match[0];
    const firstThree = parseInt(ssn.substring(0, 3), 10);
    if (firstThree !== 0 && firstThree !== 666 && !(firstThree >= 900 && firstThree <= 999)) {
      matches.push({
        text: ssn,
        start: match.index ?? 0,
        end: (match.index ?? 0) + ssn.length
      });
    }
  }
  return matches;
}
const agent = createAgent({
  model: "gpt-4o",
  // tools: [searchTool, emailTool, getWeather],
  systemPrompt: "You are a helpful assistant. Never accept, process, or acknowledge credit card numbers or Social Security Numbers (SSNs). If the user provides such sensitive information, refuse to continue and instruct them to remove it from their message.",
  middleware: [
    piiMiddleware("phone_number", {
      detector: /\+?\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{4}/,
      strategy: "mask"
    }),
    piiMiddleware("ssn", {
      detector: detectSSN,
      strategy: "block"
    }),
    piiMiddleware("credit_card", {
      detector: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12}|3(?:0[0-5]|[68][0-9])[0-9]{11})\b/g,
      strategy: "block"
    })
  ]
});
const response = await agent.invoke({
  messages: [{
    role: "user",
    content: "my phone number is +1-800-123-4567, my SSN is 123-45-6789 and my credit card is 4111111111111111"
  }]
});
console.log(response);
