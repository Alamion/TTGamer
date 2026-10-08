# Cloud API contract

The frontend's copy of the TTGamer cloud API contract (spec 030). The backend keeps the same
contract on its side; whether a shared repository follows is open.

| File                | What it holds                                                     |
| ------------------- | ----------------------------------------------------------------- |
| `openapi.yaml`      | The contract: OpenAPI 3.1, snake_case fields, rules in `info`     |
| `roll-vectors.json` | Generator test vectors for shared rolls; both sides reproduce all |
| `CHANGES.md`        | How a change is proposed and approved, and every version's record |

- `yarn validate:contract` checks the document (part of `ci:validate`).
- `yarn contract:report` compares the frontend's own schemas with the contract.
- The version the frontend implements: `src/integrations/cloud-api/version.ts`.
