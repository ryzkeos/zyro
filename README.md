# Zyro AI

AI Assistant Under Arkeos.

## About

Zyro is a full chat app with two models behind one interface. Xenon 1.0 handles fast everyday tasks, and Yuruzu 1.0 handles reasoning and image understanding. Replies stream in as they are written, conversations are saved, and the app installs on a phone or desktop like a native app.

You can stop, resume, regenerate, copy and branch a reply, upload images on Yuruzu, and find any past chat with full text search. Titles are written automatically, and chats can be pinned or renamed.

It is made to feel personal. Pick from 5 personas and 6 color themes, switch between light and dark mode, and add your own AI instructions. Accounts support email verification and password reset, and guest mode works with no sign up. Push notifications, API key rotation, rate limits and an optional Redis prompt cache keep it fast and safe to run.

## Installation

```
bash scripts/install.sh
```

Copy `.env.example` to `.env.local`, fill in the values, then run `npm run db:push`. `DATABASE_URL` must point to a PostgreSQL database.

## Usage

```
bash scripts/deploy-frontend.sh --dev
bash scripts/deploy-frontend.sh --prod
```

The app and its api run together as one Next.js app on port 7004.

## Credits

- Author: John Ruenz (ryzkeos)
- Published: November 1, 2026
- Models: Xenon 1.0, Yuruzu 1.0
- Built with: Next.js, React, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL, Upstash Redis
- Credits to Gemini and Groq for AI model provider.

## Version History

Versions v0.1 to v1.5.0 were built before this repository existed and are not tracked here. Their history is in the web-projects repository.

### v0.1 (2026-10-31) Backend And Frontend Split

- Split the project into backend and frontend folders.
- Added a backend env example and the first readme.

### v1.5.0 Model Update

- Updated the models behind Xenon and Yuruzu.

### v1.6.2 Ports In Readme

- Merged the port numbers into the readme.

### v1.6.3 Self Booting App

- App.tsx boots itself.
- Moved settings files into config folders.

### v1.6.4 (2026-11-01) Structure Import

- Imported the project into the backend and frontend structure and renamed it to zyro_ai.
- Added install and deploy scripts in scripts/.
- Fixed type imports and vite client types so tsc passes.

### v1.6.5 (2026-11-03) Prompt Cache Fix

- Fixed the reply cache key in ai_cache.py. It only used the first 500 characters of each message and the first 200 of the system prompt, so long prompts that differ later got the wrong cached reply for up to an hour.
- The key now uses the full message text and system prompt.

### v2.0.0 (2026-11-04) Next.js Rewrite

- Rewrote the app as a single Next.js project. The Flask backend and the Vite frontend are gone.
- Moved every api route into src/app/api with the same paths and the same database tables.
- Added shared server code in src/server for auth, conversations, ai providers, cache, push and email.
- Rewrote the install and deploy scripts for Next.js.
