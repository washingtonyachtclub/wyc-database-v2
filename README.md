# WYC Database v2

Database interface tool for The [Washington Yacht Club](https://washingtonyachtclub.org), a student-run recreational sailing club at the University of Washington in Seattle. Manages member records, lesson scheduling, ratings, and various club operations.

This is a ground-up rewrite replacing the legacy Perl/PHP system that was in use from approximately 2007 to 2025. The new stack is React, TypeScript, and Drizzle ORM on the TanStack ecosystem (Start, Router, Query, Table). It runs against the same MySQL database and schema as the original system.

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (full-stack React with SSR)
- **Routing**: [TanStack Router](https://tanstack.com/router) (type-safe file-based routing)
- **Data fetching**: [TanStack Query](https://tanstack.com/query) (server state management)
- **Tables**: [TanStack Table](https://tanstack.com/table) (headless table logic)
- **Forms**: [TanStack Form](https://tanstack.com/form) + [Zod](https://zod.dev) validation
- **ORM**: [Drizzle](https://orm.drizzle.team) (MySQL)
- **UI**: [shadcn/ui](https://ui.shadcn.com) (Radix + Tailwind CSS)
- **Email**: [Resend](https://resend.com)
- **Hosting**: [Vercel](https://vercel.com)

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
- [RBAC](documentation/rbac.md): role-based access control and privilege system
- [Quarter system](documentation/quarters.md): how quarters work and control membership/enrollment
- [Database queries](documentation/queries.md): SQL reference for direct DB work
- [Membership processing](documentation/membership-processing.md): how members enter the system
- [Honorary members](documentation/honorary-members.md): honorary status implementation
- [Maintenance](documentation/maintenance.md): recurring operational tasks
- [Password migration](documentation/password-migration-plan.md): legacy to Argon2id transition plan
- [Email OTP login](documentation/email-otp-login.md): passwordless login via a code sent to the member's email

# Getting Started

## Environment Setup

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

- `DATABASE_URL` — MySQL connection string
- `SESSION_SECRET` — Secret for session cookies
- `RESEND_API_KEY` — [Resend](https://resend.com) API key for sending emails
- `VITE_APP_ENV` — Set to `"dev"` for development (omit in production)

## Running the Application

```bash
npm install
npm run dev
```

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
