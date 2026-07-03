# Cooperative Platform — Architecture Overview

## 1. System Overview

The Cooperative Platform is a cloud-native, event-driven financial system
designed to manage cooperative member contributions, loans, peer-funded
requests, and annual settlement cycles.

The system is built using:

- NestJS (monorepo)
- TypeORM + PostgreSQL
- RabbitMQ (event backbone)
- Docker Compose (local infra)
- GitHub Actions (CI)

The architecture follows a **Modular Monolith** approach with an
**Event-Driven Backbone** using the Transactional Outbox pattern.

## 2. High-Level Architecture
             ┌────────────────────┐
             │       Web App       │
             └──────────┬─────────┘
                        │ REST
             ┌──────────▼─────────┐
             │        API         │
             │  (apps/api)        │
             │                    │
             │ - HTTP Controllers │
             │ - Domain Logic     │
             │ - DB Writes        │
             │ - Outbox Insert    │
             └──────────┬─────────┘
                        │
                        │ Postgres
                        │
             ┌──────────▼─────────┐
             │      Postgres      │
             │ - Core tables      │
             │ - Audit logs       │
             │ - Outbox events    │
             └──────────┬─────────┘
                        │
                        │ Poll
                        │
             ┌──────────▼─────────┐
             │       Worker       │
             │   (apps/worker)    │
             │                    │
             │ - Outbox publisher │
             │ - Event consumer   │
             │ - Projections      │
             └──────────┬─────────┘
                        │
                        │ Publish
                        ▼
                  RabbitMQ
              (topic exchange)


## 3. Architectural Principles

### 3.1 Modular Monolith

The system is structured as a monorepo with multiple applications:


Each domain (identity, ledger, loans, funding, etc.) is implemented as a
separate module inside the API.

This approach provides:

- Clear domain boundaries
- Independent testability
- Future microservice extraction path
- Operational simplicity

### 3.2 Event-Driven Architecture

All significant domain actions emit events:

- loan.issued
- payment.subscription.paid
- funding.request.fulfilled
- user.created

Events are persisted in the database using the **Transactional Outbox pattern**
before being published to RabbitMQ.


### 3.3 Transactional Outbox Pattern

To prevent data inconsistency between:

- Database writes
- Message publishing

The system writes events to an `outbox_events` table in the same transaction
as domain changes.

A separate worker process:

1. Polls unpublished outbox rows
2. Publishes events to RabbitMQ
3. Marks them as published

This guarantees eventual consistency without dual-write failures.

### 3.4 Security Model

- JWT Authentication
- Role-Based Access Control (RBAC)
- Permission-based guards
- Audit logging of all mutating operations


### 3.5 Database Strategy

- PostgreSQL
- Migrations only (no synchronize)
- Single database with separation of concerns:
  - Core domain tables
  - Audit tables
  - Outbox table
  - Projection tables (future)

## 4. Deployment Model

### Local Development

- Docker Compose
- Postgres
- RabbitMQ

### CI

- GitHub Actions
- Node 22
- Lint + Test + Build pipeline

## 5. Future Evolution

The architecture supports:

- Horizontal scaling of worker
- Event replay for projections
- Extracting domains into microservices
- Multi-tenant cooperative support
- Cloud deployment (Kubernetes ready)

## 6. Why This Architecture?

This design balances:

- Simplicity (monolith)
- Scalability (event-driven)
- Reliability (outbox pattern)
- Clean domain separation

It is intentionally designed to be production-capable while remaining
approachable for incremental development.