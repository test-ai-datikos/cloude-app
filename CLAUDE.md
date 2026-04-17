# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server with Turbopack at localhost:3000
npm run build        # Production build
npm run lint         # ESLint

# Testing
npm run test         # Run all tests with Vitest
npx vitest run src/path/to/file.test.ts  # Run a single test file

# Database
npm run setup        # Install deps + generate Prisma client + apply migrations
npm run db:reset     # Reset database (destructive)
npx prisma --config ./prisma/prisma.config.ts migrate deploy  # Apply migrations
npx prisma --config ./prisma/prisma.config.ts studio          # Open Prisma Studio
```

**Important:** All Prisma CLI commands require `--config ./prisma/prisma.config.ts` because the datasource URL lives in `prisma/prisma.config.ts` (not in `schema.prisma`), and Prisma does not auto-discover configs in subdirectories.

## Environment

Copy `.env` and set:
- `DATABASE_URL` — SQLite path, e.g. `file:./prisma/dev.db`
- `ANTHROPIC_API_KEY` — Optional. Without it the app uses `MockLanguageModel` which returns static demo components instead of calling Claude.

## Architecture

UIGen is a Next.js App Router application. Users describe React components in a chat interface; an AI generates JSX files into a virtual file system; those files are compiled in-browser with Babel and rendered in a sandboxed iframe.

### AI Generation Pipeline

`POST /api/chat` (`src/app/api/chat/route.ts`) is the core endpoint. It:
1. Calls `getLanguageModel()` (`src/lib/provider.ts`) — returns `claude-haiku-4-5` if `ANTHROPIC_API_KEY` is set, otherwise a `MockLanguageModel`.
2. Runs `streamText()` (Vercel AI SDK) with two tools: `str_replace_editor` (create/edit/view files) and `file_manager` (rename/delete).
3. Streams tool calls back to the client; also persists the final message history + file system snapshot to the `Project` row in SQLite.

The system prompt (`src/lib/prompts/generation.tsx`) instructs the model to always create `/App.jsx` as the entry point and use Tailwind CSS.

### Virtual File System

There is no disk I/O for generated files. `src/lib/file-system.ts` implements a `VirtualFileSystem` class that stores `Record<path, FileNode>` in memory. `FileSystemContext` (`src/lib/contexts/file-system-context.tsx`) wraps it in React state, exposes `handleToolCall()` to dispatch AI tool calls, and increments a `refreshTrigger` counter to notify the preview.

Serialization: the full FS state is stored as a JSON string in `Project.data`.

### Preview & Sandbox

`PreviewFrame.tsx` renders an `<iframe srcdoc=…>`. On each `refreshTrigger` change:
1. `jsx-transformer.ts` transforms every `.jsx`/`.tsx` file with Babel standalone (React + TypeScript presets).
2. Each compiled file becomes a `blob:` URL.
3. An import map is built: local imports → blob URLs; external packages → `esm.sh` CDN; React/ReactDOM → `esm.sh@19`.
4. A complete HTML document is assembled (Tailwind CDN, import map, error boundary, dynamic `import('/App.jsx')`), then set as `iframe.srcdoc`.

CSS files are stripped from JS imports and injected separately into the HTML. Missing imports generate placeholder stub components rather than throwing.

### State & Context

Two React contexts compose the app:
- **`ChatProvider`** (`src/lib/contexts/chat-context.tsx`) — owns chat messages and calls `useChat` (Vercel AI SDK). On each tool call it delegates to `FileSystemContext.handleToolCall()`.
- **`FileSystemProvider`** — owns virtual FS state and exposes file CRUD. Both are mounted in `src/app/main-content.tsx`.

### Authentication

JWT sessions in `httpOnly` cookies (7-day expiry). `src/lib/auth.ts` wraps `jose`. Server actions in `src/actions/index.ts` handle sign-up/sign-in/sign-out with bcrypt. Middleware (`src/middleware.ts`) protects `/api/projects` and `/api/filesystem`.

Anonymous users get a full session: their work (messages + FS snapshot) is saved to `localStorage` via `anon-work-tracker.ts`. On sign-in, `useAuth.handlePostSignIn()` migrates that data into a new `Project` row.

### Database

SQLite via `better-sqlite3` + Prisma adapter. Two models:
- `User` — email/password, owns many projects.
- `Project` — `messages` (JSON string) + `data` (JSON string for FS snapshot), optionally owned by a user (nullable for anonymous-originated projects).

Prisma client is generated into `src/generated/prisma`. Singleton instance in `src/lib/prisma.ts`.
