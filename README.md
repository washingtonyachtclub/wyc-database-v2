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

# Building For Production

To build this application for production:

```bash
npm run build
```

## Linting & Formatting

This project uses [eslint](https://eslint.org/) and [prettier](https://prettier.io/) for linting and formatting. Eslint is configured using [tanstack/eslint-config](https://tanstack.com/config/latest/docs/eslint). The following scripts are available:

```bash
npm run lint
npm run format
npm run check
```
