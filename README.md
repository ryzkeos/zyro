# Zyro AI

AI assistant under Arkeos.

## About

Zyro is a full chat app with two models behind one interface: Xenon 1.0 (Groq compound) for fast everyday tasks, and Yuruzu 1.0 (Gemini 3 Flash Preview) for reasoning and image understanding. It streams replies, saves conversations, and works as an installable app.

Features:
- streaming chat with stop, resume, regenerate, copy, and branch
- image upload on Yuruzu
- auto titles, pin, rename, full-text search
- 5 personas, 6 color themes, light and dark mode, custom ai instructions
- accounts with email verify and password reset, guest mode
- pwa and web push notifications
- api key rotation, rate limits, optional redis prompt cache

## Installation

Ports: database 3004, backend 5004, frontend 7004.

Backend:

```
cd backend/config
pip install -r requirements.txt
cp .env.example .env
```

Fill in `.env`. Required: `SECRET_KEY`, `XENON_API_KEY`, `YURUZU_API_KEY`, `FRONTEND_URL`. Optional: `DATABASE_URL`, resend, upstash, vapid.

Frontend:

```
cd frontend
npm install
cp .env.example .env.local
```

## Usage

```
./scripts/deploy-backend.sh --dev
./scripts/deploy-frontend.sh --dev
```

Use `--prod` for production. The backend runs at http://localhost:5004 and the frontend at http://localhost:7004.

Structure:
- `backend/src/`: `ai`, `auth`, `conversation`, `push`, `search`, `core`
- `backend/config/`: env example, gunicorn, procfile, requirements
- `frontend/src/`: `App.tsx`, `components`, `hooks`, `services`, `api`, `types`, `constants`, `utils`
- `frontend/config/`: vite and tsconfig
- `frontend/public/`: html, styles, manifest, service worker
- `scripts/`: install and deploy scripts

API:
- auth: `/api/auth/` register, login, logout, me, profile, password, ai-instructions, account, send-verification, verify-email, forgot-password, reset-password
- conversations: `/api/conversations/` list, create, delete, pin, title, messages, branch
- ai: `/api/ai/` chat, resume, auto-title, cache-status
- search: `/api/search/`
- push: `/api/push/` vapid-public-key, subscribe, unsubscribe
- health: `/api/health`

## Credits

Author: John Ruenz (Arkeos), Philippines, 2026

## Version History

- v1.6.4: imported into the backend and frontend structure, renamed to zyro_ai
- v1.6.3: self-booting App.tsx, config folders
- v1.6.2: merged ports into readme
- v1.5.0: Xenon on Groq compound, Yuruzu on Gemini 3 Flash Preview
- v0.1: backend and frontend split
