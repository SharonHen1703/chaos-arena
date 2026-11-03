# Chaos Arena

A notifications service built in stages, and later an arena where an AI agent diagnoses faults injected into the system.

**Current status:** CA-01. Two services and MongoDB, running locally without Docker. The full README is written in CA-07.

## Documents

- [`docs/spec.md`](docs/spec.md): the CA-01 spec.
- [`decisions.md`](decisions.md): decisions, trade-offs and known limitations.
- [`docs/tasks-ca-01.md`](docs/tasks-ca-01.md): the work broken down into tasks.
- [`CLAUDE.md`](CLAUDE.md): instructions for Claude Code.

## Requirements

- Node.js 22.13 or later
- MongoDB Community running locally on port 27017
- On Windows: everything inside WSL 2, with the repo on the Linux filesystem

## Running

```bash
npm ci
```

Instructions for running the services will be added as they are built.