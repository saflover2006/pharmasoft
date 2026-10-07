# Agent Instructions

## Default Mode

- Continue directly with the next reasonable implementation step.
- Do not ask for repeated confirmation.
- If the user says `continue`, resume work autonomously from the most relevant next step.
- Only stop to ask for input when the request is ambiguous, a destructive action is required, or there is a real blocker.
- After making changes, run the relevant verification steps and summarize the result.
- Prefer the smallest correct change and do not revert unrelated work already present in the repository.
