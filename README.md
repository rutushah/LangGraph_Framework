# LangGraph Framework — AI Agents with Guardrails & Middleware

A hands-on exploration of **LangChain** and **LangGraph** patterns for building production-ready AI agents. This project demonstrates two core patterns that every real-world AI application needs: **safety guardrails** and **middleware-based tool orchestration**.

---

## What's Inside

### 1. PII Guardrails Agent (`guardrailAgent.ts`)

A security-first agent that validates user input **before** it ever reaches the LLM — preventing sensitive data leaks at the application boundary.

**What it detects:**
- **SSN** — regex with validity checks (rejects `000-xx-xxxx`, `666-xx-xxxx`, and `900–999` ranges per IRS/SSA spec)
- **Credit cards** — supports Visa, Mastercard, Amex, and Discover number formats
- **Phone numbers** — masked inline before forwarding to the model

**How it works:**

```typescript
// Throws a typed PIIDetectionError before the model is ever called
checkBlockedPII(userInput);

// Phones are masked (not blocked) — sent to model as "[PHONE REDACTED]"
const sanitized = maskPhones(userInput);

await model.invoke([new SystemMessage(SYSTEM_PROMPT), new HumanMessage(sanitized)]);
```

**Custom error type** for clean, type-safe error handling:

```typescript
class PIIDetectionError extends Error {
    constructor(public piiType: string, public matches: PIIMatch[]) { ... }
}
```

---

### 2. LLM Tool Selector Middleware (`llmToolSelectorMiddleware.ts`)

An agent with a three-layer middleware pipeline that handles real-world production concerns: model failover, context window management, and intelligent tool selection.

**Tools defined (Zod-validated schemas):**

| Tool | Description |
|---|---|
| `search` | Internet search |
| `sendEmail` | Send email to a validated recipient |
| `getWeather` | Weather lookup by city |

**Middleware stack:**

```typescript
middleware: [
    modelFallbackMiddleware("gpt-4o-mini", "gpt-3.5-turbo"), // failover chain
    summarizationMiddleware({ maxTokensBeforeSummary: 8000, messagesToKeep: 20 }),
    llmToolSelectorMiddleware({ model: "gpt-4o-mini", maxTools: 2 }) // limits tools per call
]
```

---

## Key Concepts Demonstrated

| Concept | Implementation |
|---|---|
| Guardrails | Pre-LLM input validation with typed errors |
| Middleware Pattern | Composable cross-cutting concerns (fallback, summarization, tool selection) |
| Tool Definition | Zod schemas for type-safe tool inputs |
| Fail-Fast Security | Block sensitive data before any model call |
| Model Fallback | Automatic cascade across model tiers |
| Context Management | Summarization to stay within token limits |

---

## Tech Stack

- **[LangChain](https://js.langchain.com/)** — Agent orchestration and tool primitives
- **[LangGraph](https://langchain-ai.github.io/langgraphjs/)** — Graph-based agentic workflows
- **[OpenAI GPT-4o](https://platform.openai.com/docs/models)** — Primary LLM
- **[Anthropic Claude](https://www.anthropic.com/)** — Alternative LLM provider
- **[Zod](https://zod.dev/)** — Runtime schema validation for tool inputs
- **TypeScript** — End-to-end type safety

---

## Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key
- Anthropic API key (optional)

### Setup

```bash
# Install dependencies
npm install

# Configure environment variables
add .env File
# Add your OPENAI_API_KEY and ANTHROPIC_API_KEY to .env
```

### Run

```bash
# Run the PII guardrail agent
npx tsx guardrailAgent.ts

# Run the tool selector middleware agent
npx tsx llmToolSelectorMiddleware.ts
```

---

## Project Structure

```
LangGraph_Framework/
├── guardrailAgent.ts            # PII detection + safety guardrails
├── llmToolSelectorMiddleware.ts # Tool orchestration with middleware pipeline
├── guardrailAgent_compiled.mjs  # Compiled middleware variant
├── tsconfig.json
└── package.json
```

---

## Learnings

Building this surfaced a few non-obvious insights:

- **Guardrails belong before the model call**, not in the system prompt — a prompt instruction can still be bypassed; a hard block in application code cannot.
- **Middleware composition** makes it easy to add/remove cross-cutting behavior (logging, rate limiting, fallback) without touching agent logic.
- **Typed errors** (`PIIDetectionError`) make guardrail violations easy to catch, log, and surface to users meaningfully.

---

## License

MIT
