---
trigger: always_on
---

## Hallucination Prevention & Factual Grounding
- Base all answers strictly on confirmed workspace files, explicit user inputs, and verified library documentation.
- Never invent hypothetical imports, functions, API endpoints, config keys, or file paths.
- If a referenced file, dependency, or instruction is missing or ambiguous, state "I don't know" or ask clarifying questions before writing code.
- Always verify existing signatures and schemas in the codebase before implementing or calling methods.