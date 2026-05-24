<div align="center">

<img src="https://img.shields.io/badge/CodeSync_AI-Production_Grade-6366f1?style=for-the-badge&labelColor=0f172a" alt="CodeSync AI" />

# CodeSync AI

### Real-Time Collaborative Code Editor — Distributed · AI-Powered · Production Architecture

*VS Code Live Share + Replit + Google Docs — built from scratch*

<br/>

[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socket.io)](https://socket.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Kafka](https://img.shields.io/badge/Apache_Kafka-231F20?style=flat-square&logo=apache-kafka)](https://kafka.apache.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22d3ee?style=flat-square)](LICENSE)

<br/>

[**Live Demo**](#) · [**API Docs**](#api-reference) · [**Architecture**](#architecture) · [**Quick Start**](#quick-start)

<br/>

</div>

---

## What Is CodeSync AI?

CodeSync AI is a **production-architecture collaborative development platform** where multiple developers can edit the same file simultaneously, execute code in isolated sandboxes, interact with an AI assistant across 8 modes, and browse the complete version history of every file — all from the browser.

Think of it as:

| Feature | Inspiration |
|---|---|
| Real-time multi-user editing | Google Docs / VS Code Live Share |
| In-browser code execution | Replit |
| AI code assistant | GitHub Copilot / ChatGPT |
| Version history & restore | GitHub |

The entire stack is built from scratch using a **9-service microservices architecture** with Apache Kafka for async event distribution, Redis for pub/sub and presence tracking, and Docker for sandboxed code execution.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          NGINX  (Port 80)                              │
│                    Reverse Proxy / Load Balancer                       │
└──────────────────────────┬──────────────────┬──────────────────────────┘
                           │                  │
                  ┌────────▼──────┐  ┌────────▼────────┐
                  │   Frontend    │  │   API Gateway   │
                  │  Next.js 15   │  │  Express + JWT  │
                  │   Port 3000   │  │   Port 4000     │
                  └───────────────┘  └────────┬────────┘
                                              │
          ┌───────────────────────────────────┼──────────────────────────┐
          │                                   │                          │
  ┌───────▼──────┐          ┌─────────────────▼──┐     ┌────────────────▼────┐
  │ Auth Service │          │  Collaboration Svc  │     │  WebSocket Service  │
  │  Port 4001   │          │     Port 4002       │     │  Socket.IO + Redis  │
  │ JWT + bcrypt │          │  Rooms · Files      │     │     Port 4003       │
  └──────────────┘          └─────────────────────┘     └─────────────────────┘
                                      │
                   ┌──────────────────┼──────────────────┐
                   │                  │                  │
          ┌────────▼──────┐  ┌────────▼──────┐  ┌───────▼────────┐
          │  AI Service   │  │  Execution    │  │   Analytics    │
          │  Gemini/GPT/  │  │  Service      │  │   Service      │
          │  Claude 4004  │  │  Docker 4005  │  │   Port 4006    │
          └───────────────┘  └───────────────┘  └────────────────┘
                                      │
          ┌───────────────────────────▼──────────────────────────────┐
          │                    Apache Kafka                           │
          │  room-events · collaboration-events · execution-events   │
          │  ai-events · notification-events · dead-letter-events    │
          └────────────────────────┬─────────────────────────────────┘
                                   │
                  ┌────────────────┼──────────────────┐
                  │                │                  │
         ┌────────▼──────┐ ┌───────▼──────┐  ┌───────▼────────┐
         │  Notification │ │   History    │  │   PostgreSQL   │
         │  Port 4007    │ │   Port 4008  │  │  + Redis Cache │
         │  Kafka + WS   │ │   Snapshots  │  │                │
         └───────────────┘ └──────────────┘  └────────────────┘
```

### Service Responsibilities

| Service | Port | Responsibility |
|---|---|---|
| **API Gateway** | 4000 | Single HTTP entry point — JWT verification, rate limiting (200 req/min/IP), request proxying |
| **Auth Service** | 4001 | Registration, login, JWT access (15 min) + refresh (7 days) token rotation, bcrypt hashing |
| **Collaboration** | 4002 | Rooms, files, members, invite codes — write-heavy persistent state |
| **WebSocket** | 4003 | Socket.IO real-time engine — per-file rooms, Redis pub/sub adapter for horizontal scaling |
| **AI Service** | 4004 | Gemini 2.0 Flash / GPT / Claude — 8 modes, SSE streaming, AbortController cancellation |
| **Execution** | 4005 | Docker-sandboxed code runner — 30s timeout, 128 MB RAM, zero network access |
| **Analytics** | 4006 | Event aggregation, 8 event types, 5-tab live admin dashboard (10–30s auto-refresh) |
| **Notification** | 4007 | Decoupled in-app alerts — Kafka consumer, Socket.IO delivery, typed notifications |
| **History** | 4008 | Full content snapshots per save, version timeline, one-click restore with broadcast |

---

## Features

### Real-Time Collaboration
- **Simultaneous multi-user editing** — Monaco Editor with revision-based operation transforms
- **Live cursor presence** — see other users' cursor positions and selections in real time
- **Per-file Socket.IO rooms** — broadcasts scoped precisely to `file:{fileId}`, preventing cross-file contamination
- **Horizontal scaling** — Redis pub/sub adapter synchronises across multiple WebSocket server instances
- **Typing indicators** — live "User is typing..." awareness

### AI Assistant (8 Modes)
| Mode | Description |
|---|---|
| **Generate** | Write code from a natural language description |
| **Chat** | Context-aware conversation with your codebase |
| **Review** | Code quality analysis and best-practice suggestions |
| **Debug** | Identify bugs and explain fixes with examples |
| **Explain** | Line-by-line explanation for any code block |
| **Refactor** | Improve structure, readability, and performance |
| **Complete** | Intelligent code completion from the cursor position |
| **Docs** | Generate JSDoc / docstring documentation |

All modes stream responses **token-by-token via SSE** — users see output as it generates, not after.

### Code Execution Sandbox
- **Supported languages:** JavaScript · Python · Java · C++
- **Isolation:** Each run gets a fresh Docker container — `NetworkDisabled`, `CapDrop: ALL`, `ReadonlyRootfs`
- **Hard limits:** 30-second timeout · 128 MB memory ceiling · CPU quota enforced
- **Output:** `stdout` · `stderr` · `exitCode` · `executionTimeMs` returned per run
- Container is **destroyed immediately** post-execution — zero persistence, zero side effects

### Version History
- Full **content snapshot** stored on every save
- **Timeline view** with sequential version numbers, author, and timestamp
- **Expandable diff preview** — first 30 lines with line count delta vs previous version
- **One-click restore** — overwrites current content and broadcasts to all active collaborators via Socket.IO
- Optimistic locking ready for concurrent restore conflict resolution

### Analytics Dashboard
- **5 tabs:** Overview · Executions · AI · Events · Rooms
- **Live stat cards:** total users, sessions, rooms, executions, AI calls, collaboration ops
- **Charts:** language breakdown bar chart, AI mode donut, latency histogram, room leaderboard
- **Event log:** real-time platform event stream with type badges, user context, and relative timestamps
- **Service health grid:** live ping status for all 9 services

### Notification System
- **Typed notifications:** `execution` (language + exit code + runtime) · `invite` · `system`
- **NotificationBell:** live unread badge, dropdown with 8 latest, mark-all-read
- **Full /notifications page:** filter by type, date-grouped (Today / Yesterday / date), per-item actions
- Architecture: **Kafka consumer → DB → React Query poll** (WebSocket push upgrade path built in)

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 15 App Router | Server components, file-based routing, API rewrite proxying |
| **Language** | TypeScript | End-to-end type safety across all services |
| **Editor** | Monaco Editor | Same engine as VS Code — 90+ languages, programmatic API |
| **Server State** | React Query (TanStack) | Caching, background refetch, optimistic mutations, lazy loading |
| **Client State** | Zustand | Lightweight store with persist middleware — auth, editor ref, collaborators |
| **Styling** | Tailwind CSS | Utility-first, dark mode via CSS variables, consistent tokens |
| **Backend** | Node.js + Express | Fast, non-blocking I/O; consistent JS/TS across the stack |
| **Real-time** | Socket.IO | Bidirectional events, automatic reconnection, room scoping |
| **Message Queue** | Apache Kafka | Async decoupled event distribution, dead-letter queue, replay |
| **Database** | PostgreSQL 16 | Relational integrity for users, rooms, files, versions, events |
| **Cache / Pub-Sub** | Redis 7 | Socket.IO adapter, presence tracking, rate-limit counters, sessions |
| **AI** | Gemini 2.0 Flash | Low-latency streaming; switchable to GPT-4 or Claude |
| **Execution** | Dockerode | Per-run container isolation with hard resource limits |
| **Proxy** | Nginx | Reverse proxy, load balancer, static asset serving |
| **Infra** | Docker Compose | One-command full-stack startup for all 14 services |

---

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Docker Compose
- Node.js 20+ *(for local development only)*
- At least one AI API key

### 1. Clone & Configure

```bash
git clone https://github.com/kumar1035/codesync-ai.git
cd codesync-ai
cp .env.example .env
```

Open `.env` and add your AI provider key:

```env
GEMINI_API_KEY=your-gemini-key-here

AI_PROVIDER=gemini    # openai | claude | gemini
```

### 2. Start Everything

```bash
docker-compose up --build
```

This single command starts **14 services** in the correct dependency order:
PostgreSQL → Redis → Zookeeper → Kafka → all 9 backend microservices → Next.js frontend → Nginx

Database migrations run automatically via `docker/postgres/init.sql`.

### 3. Open the App

| Service | URL |
|---|---|
| **Application** | http://localhost:3000 |
| **API Gateway** | http://localhost:4000 |
| **Kafka UI** | http://localhost:8090 |
| **WebSocket** | http://localhost:4003 |

> First build may take 3–5 minutes while Docker pulls runtime images for code execution (node, python, openjdk, gcc).

---

## Local Development (without Docker)

```bash
# Install all workspace dependencies
npm install

# Start infrastructure only (DB, cache, message queue)
docker-compose up postgres redis zookeeper kafka -d

# Run all 9 backend services concurrently
npm run dev:services

# Start frontend in a separate terminal
cd frontend && npm run dev
```


### History  `/api/history`

```http
GET    /api/history/file/:fileId           All versions (newest first)
GET    /api/history/version/:versionId     Specific version content
POST   /api/history/restore/:versionId     Restore file to this version
GET    /api/history/room/:roomId/events    Room event log replay
```

### Analytics  `/api/analytics`

```http
GET    /api/analytics/overview       Totals: users, sessions, executions, AI calls
GET    /api/analytics/executions     Grouped by language — count, avg time, success rate
GET    /api/analytics/ai             Grouped by mode — count, avg latency
GET    /api/analytics/active-rooms   Rooms sorted by member count
GET    /api/analytics/events         Recent platform event log (last N events)
```

---

## WebSocket Events

### Client → Server

```javascript
socket.emit('room:join',       { roomId, fileId? })
socket.emit('room:leave',      { roomId })
socket.emit('file:operation',  { fileId, roomId, operation: { content }, revision })
socket.emit('cursor:update',   { roomId, fileId, position, selection })
socket.emit('typing:start',    { roomId, fileId })
socket.emit('typing:stop',     { roomId, fileId })
socket.emit('chat:message',    { roomId, message })
```

### Server → Client

```javascript
socket.on('room:presence',           ({ members }) => { ... })
socket.on('file:state',              ({ content, revision }) => { ... })
socket.on('file:operation:ack',      ({ ok, revision }) => { ... })
socket.on('file:operation:broadcast',({ operation, revision, userId }) => { ... })
socket.on('cursor:broadcast',        ({ userId, username, fileId, position }) => { ... })
socket.on('typing:broadcast',        ({ userId, username, fileId, typing }) => { ... })
socket.on('chat:broadcast',          ({ id, userId, username, message, ts }) => { ... })
```

---

## Kafka Topics

| Topic | Publisher | Consumers |
|---|---|---|
| `room-events` | Collaboration Service | Analytics, Notification |
| `collaboration-events` | WebSocket Service | Analytics, History |
| `execution-events` | Execution Service | Analytics, Notification |
| `ai-events` | AI Service | Analytics |
| `notification-events` | Any service | Notification Service |
| `analytics-events` | Auth, AI Services | Analytics Service |
| `dead-letter-events` | Any failed consumer | Monitoring / Replay |

---

## Database Schema

Core tables (see `docker/postgres/init.sql` for complete DDL):

```
users                 id, username, email, password_hash, avatar_style, created_at
refresh_tokens        id, user_id, token_hash, expires_at
rooms                 id, name, description, is_public, owner_id, invite_code
room_members          room_id, user_id, role, joined_at
files                 id, room_id, filename, language, content, version, updated_by
file_versions         id, file_id, version_number, content_snapshot, created_by, change_summary
executions            id, file_id, room_id, user_id, language, stdout, stderr, exit_code, execution_time_ms
ai_interactions       id, user_id, file_id, mode, prompt, response, latency_ms
event_logs            id, event_type, user_id, room_id, metadata, created_at
notifications         id, user_id, type, title, message, metadata, read, created_at
```

---

## Distributed Systems Features

| Feature | Implementation |
|---|---|
| **Horizontal Scaling** | Socket.IO + Redis Pub/Sub adapter — multiple WS instances stay in sync |
| **Event Sourcing** | Kafka topics + `event_logs` table — full audit trail, replayable |
| **Operation Transforms** | Revision-based OT — concurrent edits resolved in order |
| **Rate Limiting** | `express-rate-limit` + Redis counters — 200 req/min/IP at gateway |
| **Distributed Locking** | Redis `SETNX` — prevents race conditions on shared resources |
| **Dead Letter Queue** | Kafka `dead-letter-events` — failed events captured for replay |
| **Session Caching** | Redis `session:{userId}` keys — reduces DB auth lookups |
| **Presence Tracking** | Redis hashes per room — real-time member online/offline state |
| **Async Execution** | Kafka `execution-events` queue — decouples run request from result delivery |
| **Sandboxed Execution** | Docker per-run containers — `NetworkDisabled`, `CapDrop: ALL`, `ReadonlyRootfs` |

---

## Security

```
Authentication    JWT access tokens (15 min) + refresh token rotation (7 days)
Password Storage  bcrypt with cost factor 12
Execution         NetworkDisabled · CapDrop: ALL · ReadonlyRootfs · no-new-privileges
Resource Limits   30s timeout · 128 MB memory · CPU quota per container
Rate Limiting     express-rate-limit on all sensitive endpoints
Input Validation  Zod schemas on all request bodies
CORS              Configured per environment (strict in production)
```

---



---





## License


<div align="center">

Built with precision · Distributed by design · AI-augmented by default

</div>
