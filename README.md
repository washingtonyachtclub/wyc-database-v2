# WYC Database v2

Database interface tool for The [Washington Yacht Club](https://washingtonyachtclub.org), a student-run recreational sailing club at the University of Washington in Seattle. Manages member records, lesson scheduling, ratings, and various club operations.

This is a ground-up rewrite replacing the legacy Perl/PHP system that was in use from approximately 2007 to 2025. The new stack is React, TypeScript, and Drizzle ORM on the TanStack ecosystem (Start, Router, Query, Table). It uses Cloudflare D1 and preserves the legacy record identifiers.

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (full-stack React with SSR)
- **Routing**: [TanStack Router](https://tanstack.com/router) (type-safe file-based routing)
- **Data fetching**: [TanStack Query](https://tanstack.com/query) (server state management)
- **Tables**: [TanStack Table](https://tanstack.com/table) (headless table logic)
- **Forms**: [TanStack Form](https://tanstack.com/form) + [Zod](https://zod.dev) validation
- **ORM**: [Drizzle](https://orm.drizzle.team) (SQLite on D1)
- **UI**: [shadcn/ui](https://ui.shadcn.com) (Radix + Tailwind CSS)
- **Email**: [Resend](https://resend.com)
- **Hosting**: [Cloudflare Workers](https://workers.cloudflare.com)

## Project Structure

```
src/
  components/       # React components, organized by domain
    ui/             # shadcn/ui primitives and shared UI components
  db/               # Database layer — schema, types, mappers, query helpers
  domains/          # Domain-specific logic (queries, mappers, types per domain)
  hooks/            # Shared React hooks
  integrations/     # External service integrations (email, etc.)
  lib/              # Server functions and shared utilities
  routes/           # TanStack Router file-based routes
```

## Documentation

See `documentation/` for detailed docs:

- [Architecture](documentation/architecture.md): codebase structure, type system, data flow patterns
- [Schema overview](documentation/schema-overview.md): all database tables
- [Database schema changes](documentation/database-schema-changes.md): Drizzle migrations, pull requests, and deployment safety
- [RBAC](documentation/rbac.md): role-based access control and privilege system
- [Quarter system](documentation/quarters.md): how quarters work and control membership/enrollment
- [Database queries](documentation/queries.md): SQL reference for direct DB work
- [New member signup](documentation/new-member-signup.md): payment, application, and approval flow
- [Honorary members](documentation/honorary-members.md): honorary status implementation
- [Maintenance](documentation/maintenance.md): recurring operational tasks
- [Email OTP login](documentation/email-otp-login.md): passwordless login via a code sent to the member's email
- [Sail Locker mode](documentation/sail-locker-mode.md): device-specific session lifetimes for the shared computer

## Issue Tracking

Issues are tracked in Linear. See [https://database.washingtonyachtclub.org/maintenance-tracker](https://database.washingtonyachtclub.org/maintenance-tracker).

# Getting Started

## Environment Setup

Set the public Vite variables from `.env.example` in `.env.local`. Put server secrets in `.dev.vars.local`. Use a random session secret of at least 32 characters and Square sandbox credentials in development.

## Running the application

```bash
npm ci &&
npm run db:migrate:local &&
npm run dev
```

The local Worker uses Wrangler's local SQLite and R2 stores. For hosted development, `npm run db:migrate:dev` applies migrations to `wyc-database-dev`, and `npm run deploy:dev` builds and publishes the Worker. Set runtime secrets on the Worker. The Cloudflare dashboard's D1 Console supports SQL reports and writes.

## Linting & Formatting

This project uses [ESLint](https://eslint.org/) for code quality and [Prettier](https://prettier.io/) for formatting. ESLint is configured using [@tanstack/eslint-config](https://tanstack.com/config/latest/docs/eslint) with [eslint-config-prettier](https://github.com/prettier/eslint-config-prettier) to avoid rule conflicts.

### Editor Setup (VS Code)

Install the [Prettier extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode). The project includes `.vscode/settings.json` which automatically enables format-on-save and sets Prettier as the default formatter.

### Scripts

```bash
npm run lint           # Run ESLint
npm run format         # Format all files with Prettier
npm run format:check   # Check formatting without writing (useful for CI)
```

### Prettier Rules

Configured in `prettier.config.js`:

- No semicolons
- Single quotes
- Trailing commas
- 100 character line width
