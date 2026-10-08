# Cloud API contract — changes

## How a change is made

1. Either side proposes a change: a pull request (or the side's own change record) that edits
   `openapi.yaml`, adds an entry below with the next version, and names its author.
2. The other side reviews it and records the approval (name, date) in the entry, or requests
   changes. Nothing is implemented against an unapproved version.
3. Versions are semantic: a change that breaks a client or a server already built against the
   contract (a removed or renamed field, a stricter limit, a changed meaning) bumps the major
   version; an addition bumps the minor; wording bumps the patch.
4. Each side declares the version it implements: the backend in `GET /version`, the frontend in
   `src/integrations/cloud-api/version.ts`.

## 0.1.0 — 2026-10-08

- **Author**: frontend (spec 030).
- **Approval**: pending — backend.
- First draft: accounts and sessions, documents and library items moved to the cloud with their
  ids, revision checks, dependencies of a record, usage and quotas, shared rolls with seeds
  (`ttg-sha256-ctr-1`, `roll-vectors.json`), one error model. Rules for ids, opaque content,
  migrations, and what is deferred are in `info.description`.
- Open for the backend's review: the session transport (refresh cookie), the 413 status for
  quota errors, the password rule (length plus a breached-password check), and the nickname
  length (2–50).
