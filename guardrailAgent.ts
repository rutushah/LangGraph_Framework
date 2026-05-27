import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// ---- Types ----
interface PIIMatch {
    text: string;
    start: number;
    end: number;
}

// ---- Custom error ----
class PIIDetectionError extends Error {
    constructor(public piiType: string, public matches: PIIMatch[]) {
        super(`PII detected: ${piiType}`);
        this.name = "PIIDetectionError";
    }
}

// ---- Detectors ----
function detectSSN(content: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const pattern = /\d{3}-\d{2}-\d{4}/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(content)) !== null) {
        const ssn = match[0];
        const firstThree = parseInt(ssn.substring(0, 3), 10);
        if (firstThree !== 0 && firstThree !== 666 && !(firstThree >= 900 && firstThree <= 999)) {
            matches.push({
                text: ssn,
                start: match.index,
                end: match.index + ssn.length,
            });
        }
    }
    return matches;
}

function maskPhones(content: string): string {
    return content.replace(
        /\+?\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{4}/g,
        "[PHONE REDACTED]"
    );
}

function checkBlockedPII(content: string): void {
    // Check SSN
    const ssnMatches = detectSSN(content);
    if (ssnMatches.length > 0) {
        throw new PIIDetectionError("ssn", ssnMatches);
    }

    // Check credit card
    const ccPattern = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12}|3(?:0[0-5]|[68][0-9])[0-9]{11})\b/g;
    const ccMatches = [...content.matchAll(ccPattern)].map(m => ({
        text: m[0],
        start: m.index!,
        end: m.index! + m[0].length,
    }));
    if (ccMatches.length > 0) {
        throw new PIIDetectionError("credit_card", ccMatches);
    }
}

// ---- Model setup ----
const model = new ChatOpenAI({ model: "gpt-4o" });

const SYSTEM_PROMPT = "You are a helpful assistant. Never accept, process, or acknowledge credit card numbers or Social Security Numbers (SSNs). If the user provides such sensitive information, refuse to continue and instruct them to remove it from their message.";

// ---- Invocation ----
try {
    const userInput = "my phone number is +1-800-123-4567, my SSN is 123-45-6789 and my credit card is 4111111111111111";

    checkBlockedPII(userInput);               // throws if SSN or CC found
    const sanitized = maskPhones(userInput);  // mask phones before sending

    const response = await model.invoke([
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(sanitized),
    ]);

    console.log(response.content);
} catch (err) {
    if (err instanceof PIIDetectionError) {
        console.error(`Blocked: ${err.piiType} detected (${err.matches.length} occurrence(s)). Message was not sent to the model.`);
    } else {
        throw err;
    }
}