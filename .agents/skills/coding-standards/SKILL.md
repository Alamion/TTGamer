---
name: coding-standards
description: Repository-wide review checklist for maintainability, boundaries, validation, accessibility, and verification.
---

# TTGamer Coding Standards

Use this skill for cross-module review or tooling work. For TypeScript details, also load `../typescript/SKILL.md`; for domain logic, load the corresponding module skill.

## Review Priorities

1. Correctness and data loss risks.
2. Runtime-boundary validation and resource limits.
3. Module ownership and small public APIs.
4. Accessibility and responsive interaction.
5. Tests and executable verification.
6. Naming, duplication, and cosmetic cleanup.

## Repository Boundaries

- `shared/` is system- and service-independent.
- `integrations/` owns external services and cross-feature adapters.
- Feature internals should import their owning files; barrels are public contracts, not convenience dumps.
- Catalog data is static code but still untrusted at build time; validate IDs and cross-references.
- Preserve user changes in a dirty worktree and avoid broad rewrites unrelated to the task.

## Implementation Checklist

- Prefer the smallest coherent change that removes the root cause.
- Reuse existing schemas/utilities and delete retired representations once compatibility parsing is covered.
- Give every loop, recursive modifier, input size, external payload, and persisted collection an explicit bound where growth is user-controlled.
- Use semantic HTML and keyboard-operable controls; new dialogs should use Radix focus management.
- Keep errors useful to users without exposing secrets or upstream bodies.
- External-service logs must never include credentials, webhook URLs, user message contents, or upstream response bodies. Log only bounded metadata such as operation, reason category, and status code.
- Test behavior at public boundaries and add regression tests for each fixed bug.

## Verification

- `yarn verify:fast`: formatting/lint/type safety.
- `yarn verify`: plus tests.
- `yarn verify:full`: plus validators, generated styles, and production build through the build lifecycle.

Do not copy generic framework/API patterns into this repository when the repository has no such server or framework.
