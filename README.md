# Zyro AI

AI chat assistant by Arkeos.

## About

Zyro is a chat app with persona-based tone, saved conversations, and cookie-based login. It runs two models behind one interface: yuruzu-1.0 (gemini) and xenon-1.0 (openrouter/groq). Keys rotate across a comma-separated list.

## Installation

backend:

```
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

frontend:

```
cd frontend
npm install
cp env.local.example .env.local
```

## Usage

```
cd backend && python app.py
cd frontend && npm run dev
```

frontend runs on http://localhost:5173 and proxies /api to http://localhost:5000.

## Credits

Author: Akiro (Arkeos)

## Version History

- v0.1: initial structure, backend and frontend split
