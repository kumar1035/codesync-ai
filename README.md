# CodeSync AI — Distributed Collaborative Code Editor

> Production-grade, distributed, AI-powered real-time collaborative code editor.
> VS Code Live Share + Replit + Google Docs — built from scratch.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      NGINX (Port 80)                     │
│               Reverse Proxy / Load Balancer              │
└─────────┬──────────────────────────┬────────────────────┘
          │                          │
   ┌──────▼──────┐          ┌────────▼────────┐
   │  Frontend   │          │   API Gateway   │
   │ Next.js 15  │          │  Express + JWT  │
   │  Port 3000  │          │   Port 4000     │
   └─────────────┘          └────────┬────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
┌───────▼──────┐  ┌─────────────────▼───┐  ┌──────────────────────▼──┐
│ Auth Service │  │ Collaboration Svc   │  │  WebSocket Service       │
│  Port 4001   │  │     Port 4002       │  │  Socket.IO + Redis Pub   │
│  JWT + bcrypt│  │  Rooms + Files      │  │  Sub — Port 4003         │
└──────┬───────┘  └──────────┬──────────┘  └──────────────┬──────────┘
       │                     │                             │
       │          ┌──────────▼──────────┐                 │
       │          │    AI Service       │                 │
       │          │  OpenAI/Claude/     │                 │
       │          │  Gemini — Port 4004 │                 │
       │          └──────────┬──────────┘                 │
       │                     │                             │
       │          ┌──────────▼──────────┐                 │
       │          │ Execution Service   │                 │
       │          │ Docker Sandbox      │                 │
       │          │ JS/Python/C++/Java  │                 │
       │          │ Port 4005           │                 │
       │          └──────────┬──────────┘                 │
       │                     │                             │
┌──────▼──────────────────────▼─────────────────────────────▼──────┐
│                      Apache Kafka                                  │
│  Topics: room-events | collaboration-events | execution-events    │
│          ai-events | notification-events | analytics-events       │
│          retry-events | dead-letter-events                        │
└──────┬──────────────────────────────────────────────────┬─────────┘
       │                                                  │
┌──────▼──────┐  ┌─────────────────────┐  ┌──────────────▼──────────┐
│  Analytics  │  │  Notification Svc   │  │   History Service        │
│  Port 4006  │  │  Port 4007          │  │   Port 4008              │
│Kafka Consumer│  │  Kafka + Socket.IO  │  │   Event Sourcing         │
└──────┬──────┘  └─────────────────────┘  └──────────────┬──────────┘
       │                                                  │
┌──────▼──────────────────────────────────────────────────▼──────┐
│               PostgreSQL (Port 5432) + Redis (Port 6379)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Monaco Editor |
| State | Zustand, React Query |
| Real-time | Socket.IO, Redis Pub/Sub Adapter |
| Backend | Node.js, Express.js, TypeScript |
| Auth | JWT (access+refresh rotation), bcrypt |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Message Queue | Apache Kafka |
| AI | OpenAI / Claude / Gemini (switchable) |
| Execution | Dockerode (sandboxed containers) |
| DevOps | Docker Compose, Nginx |

---

## Quick Start

### Prerequisites
- Docker Desktop (with Docker Compose)
- Node.js 20+ (for local dev)
- At least one AI API key

### 1. Clone & Configure

```bash
git clone <your-repo>
cd codesync-ai
```

Edit `.env` and add your AI API key:
```env
OPENAI_API_KEY=sk-your-key-here
# OR
CLAUDE_API_KEY=sk-ant-your-key-here
# OR
GEMINI_API_KEY=your-key-here
AI_PROVIDER=openai   # openai | claude | gemini
```

### 2. Start Everything

```bash
docker-compose up --build
```

This starts:
- PostgreSQL (auto-migrated via `docker/postgres/init.sql`)
- Redis
- Zookeeper + Kafka + Kafka UI
- All 9 backend microservices
- Next.js frontend
- Nginx reverse proxy

### 3. Access

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| API Gateway | http://localhost:4000 |
| WebSocket | http://localhost:4003 |
| Kafka UI | http://localhost:8090 |

---

## Service Ports

| Service | Port |
|---------|------|
| Frontend | 3000 |
| API Gateway | 4000 |
| Auth Service | 4001 |
| Collaboration Service | 4002 |
| WebSocket Service | 4003 |
| AI Service | 4004 |
| Execution Service | 4005 |
| Analytics Service | 4006 |
| Notification Service | 4007 |
| History Service | 4008 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Kafka | 9092 |
| Kafka UI | 8090 |

---

## API Reference

### Auth (`/api/auth`)
```
POST /api/auth/register    { username, email, password }
POST /api/auth/login       { email, password }
POST /api/auth/refresh     { refreshToken }
POST /api/auth/logout      Bearer token required
GET  /api/auth/me          Bearer token required
```

### Rooms (`/api/rooms`)
```
GET    /api/rooms           List my rooms
POST   /api/rooms           { room_name, description, is_public }
GET    /api/rooms/:id       Get room details
PUT    /api/rooms/:id       Update room
DELETE /api/rooms/:id       Delete room
POST   /api/rooms/:id/join  Join public room
POST   /api/rooms/:id/leave Leave room
GET    /api/rooms/:id/members
POST   /api/rooms/:id/invite { invite_code }
```

### Files (`/api/files`)
```
GET  /api/files/room/:roomId   List files in room
POST /api/files/room/:roomId   { filename, language, content }
GET  /api/files/:id
PUT  /api/files/:id            { content, language }
DELETE /api/files/:id
```

### AI (`/api/ai`)
```
POST /api/ai/complete    { code, language, stream? }
POST /api/ai/review      { code, language }
POST /api/ai/debug       { code, language, error }
POST /api/ai/explain     { code, language }
POST /api/ai/refactor    { code, language, instructions? }
POST /api/ai/chat        { message, context? }
POST /api/ai/docs        { code, language }
GET  /api/ai/history
```

### Code Execution (`/api/execute`)
```
POST /api/execute    { language, code, stdin?, roomId? }
GET  /api/execute/:id
GET  /api/execute/room/:roomId
```

### Analytics (`/api/analytics`)
```
GET /api/analytics/overview
GET /api/analytics/executions
GET /api/analytics/ai
GET /api/analytics/active-rooms
GET /api/analytics/events
```

### History (`/api/history`)
```
GET  /api/history/file/:fileId            All versions
GET  /api/history/version/:versionId      Specific version
POST /api/history/restore/:versionId      Restore version
GET  /api/history/room/:roomId/events     Event log replay
```

---

## WebSocket Events

### Client → Server
```
room:join         { roomId, fileId? }
room:leave        { roomId }
file:operation    { fileId, roomId, operation: { content }, revision }
cursor:update     { roomId, fileId, position, selection }
typing:start      { roomId, fileId }
typing:stop       { roomId, fileId }
chat:message      { roomId, message }
```

### Server → Client
```
room:presence     { members: [...] }
file:state        { content, revision }
file:operation:ack       { ok, revision }
file:operation:broadcast { operation, revision, userId }
cursor:broadcast  { userId, username, fileId, position }
typing:broadcast  { userId, username, fileId, typing }
chat:broadcast    { id, userId, username, message, ts }
```

---

## Kafka Topics

| Topic | Publisher | Consumer |
|-------|-----------|----------|
| `room-events` | collaboration-service | analytics, notification |
| `collaboration-events` | websocket-service | analytics, history |
| `execution-events` | execution-service | analytics, notification |
| `ai-events` | ai-service | analytics |
| `notification-events` | any service | notification-service |
| `analytics-events` | auth, ai services | analytics-service |

---

## Database Schema

See `docker/postgres/init.sql` for the complete schema with:
- `users`, `refresh_tokens`
- `rooms`, `room_members`
- `files`, `file_versions`
- `executions`, `ai_interactions`
- `event_logs`, `notifications`
- `analytics_snapshots`

---

## Distributed Systems Features

| Feature | Implementation |
|---------|---------------|
| Horizontal Scaling | Socket.IO + Redis Pub/Sub adapter |
| Event Sourcing | Kafka topics + `event_logs` table |
| OT Sync | Revision-based operation transforms |
| Rate Limiting | Express-rate-limit + Redis |
| Distributed Locking | Redis SETNX |
| Dead Letter Queue | Kafka `dead-letter-events` topic |
| Session Caching | Redis `session:{userId}` keys |
| Presence Tracking | Redis hashes per room |
| Async Execution | Kafka `execution-events` queue |
| Sandboxed Code | Docker containers (no network, limited memory/CPU) |

---

## Security

- JWT access tokens (15min) + refresh token rotation (7 days)
- bcrypt password hashing (cost 12)
- Docker sandbox: `NetworkDisabled`, `CapDrop: ALL`, `ReadonlyRootfs`, `no-new-privileges`
- Memory + CPU limits on execution containers
- Rate limiting on all sensitive endpoints
- Input validation via Zod schemas
- CORS configured per environment

---

## Development (without Docker)

```bash
# Install all workspace dependencies
npm install

# Start infrastructure only
docker-compose up postgres redis zookeeper kafka -d

# Run all services concurrently
npm run dev:services

# Start frontend
cd frontend && npm run dev
```

---

## Environment Variables

See `.env` (backend) and `frontend/.env.local` for all required variables.
All variables have safe defaults for local development.
Only the AI API keys need to be provided.
