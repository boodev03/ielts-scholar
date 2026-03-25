---
name: supabase-api-feature
description: Use this skill when implementing new product features with Supabase in this codebase, especially when the feature requires SQL schema updates, typed API contracts, client hooks, and server actions.
---

# Supabase API Feature Rules

Use this workflow for any new feature that touches data or auth.

## Required Architecture

Always keep this order:

1. `request (client)`
2. `hooks (tanstack query)`
3. `services (use server)`
4. `supabase`

Do not create Next.js API route handlers for feature logic unless explicitly requested.

## Folder Conventions

- SQL: `sql/schema.sql`
- Shared API contracts: `types/api.ts`
- Feature request/response + validation: `types/<feature>.ts`
- Per-table model types: `types/tables.ts`
- Client request layer: `requests/<feature>.request.ts`
- Query hooks: `hooks/api/use-<feature>.ts`
- Server actions: `services/<feature>/<feature>.service.ts`
- Client state (UI-only): `stores/<feature>-store.ts`

## API Contract Standard

Every service action must return:

- `ApiResponse<T>` from `types/api.ts`
- Success: `{ success: true, data, error: null }`
- Failure: `{ success: false, data: null, error: { code, message, details? } }`

Never throw raw errors to the UI path; map to `ApiErrorCode`.

## Validation Rules

- Validate all external input with `zod` in `types/<feature>.ts`.
- Reuse schemas in both form validation and server action validation.
- On validation failure, return `VALIDATION_ERROR` with flattened details.

## Supabase Rules

- Use `lib/supabase/server.ts` in server actions.
- Use RLS on all user-owned tables.
- Add indexes for common query paths.
- Add `created_at` and `updated_at` fields; use trigger for `updated_at`.
- Keep table names plural and explicit (`user_profiles`, `flashcards`, etc.).

## React Rules

- Forms: `react-hook-form` + `zod` validation (via `zodResolver` or explicit `safeParse`).
- Server state: `@tanstack/react-query`.
- Client state: `zustand` (only UI/session-local state).
- Surface user feedback with Sonner toasts for success/error.

## Delivery Checklist

1. SQL migration update in `sql/schema.sql`
2. Types updated in `types/`
3. Server actions implemented in `services/`
4. Request layer + hooks implemented
5. UI forms integrated with RHF + zod
6. `pnpm lint` and `pnpm exec tsc --noEmit` pass
