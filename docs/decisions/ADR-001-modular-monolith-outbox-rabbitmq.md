# ADR-001: Modular Monolith with Transactional Outbox and RabbitMQ

## Status
Accepted

## Context

The Cooperative Platform must:

- Support financial operations with high integrity
- Maintain auditability
- Be scalable in the future
- Remain simple to operate in early stages
- Demonstrate cloud-native design principles

A traditional microservices architecture was considered but rejected
due to:

- Increased operational complexity
- Distributed transactions
- DevOps overhead early in the project

## Decision

We will implement a **Modular Monolith architecture** with:

- Clear domain module boundaries
- Transactional Outbox pattern for event publishing
- RabbitMQ as the event broker
- Separate worker process for asynchronous handling

## Architecture Components

1. API (write side)
   - Handles HTTP
   - Performs domain logic
   - Writes DB state
   - Inserts outbox events

2. Worker (async processor)
   - Polls outbox table
   - Publishes to RabbitMQ
   - Consumes events for projections

3. RabbitMQ
   - Topic exchange (`coop.events`)
   - Durable queues
   - Persistent messages

## Why Modular Monolith?

- Maintains strong domain boundaries
- Avoids distributed transaction problems
- Enables incremental extraction into services later
- Simplifies CI/CD and deployment

## Why Transactional Outbox?

Avoids dual-write problems:

Bad pattern:
- Write DB
- Publish event
- If publish fails → inconsistent state

Outbox pattern:
- Write DB + outbox row in same transaction
- Publish later
- Guaranteed eventual consistency

## Why RabbitMQ?

- Mature and reliable
- Supports topic routing
- Well-supported in Node ecosystem
- Easy to run locally with Docker
- Production-ready

## Consequences

### Positive

- Reliable event publishing
- Clean separation of concerns
- Scalable async processing
- Strong audit trail support

### Tradeoffs

- Slightly increased complexity
- Requires polling mechanism
- Eventual consistency model

## Future Considerations

- Replace polling with logical decoding or Debezium
- Introduce dead-letter queues
- Add event versioning
- Extract domains into microservices