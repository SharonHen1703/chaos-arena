# Chaos Arena

A notifications service built in stages, and later a fault arena for an SRE agent. Current stage: CA-01, `notifications-api` and `preferences` on top of a local MongoDB, without Docker.

## Sources of truth

- `docs/spec.md`: what we are building. If a request contradicts it, stop and ask.
- `decisions.md`: why we chose what we chose. Do not reopen a decision unless I ask.
- `docs/tasks-ca-01.md`: the CA-01 tasks, in order.
- Do not invent decisions. When the spec has no answer, present the options and your recommendation. After I decide, add the decision to `decisions.md`.

## Structure

- `services/<name>`: each service stands on its own, with its own `package.json` and lock file.
- No shared package and no npm workspaces. The duplication (AppError, request id) is intentional.
- A service never accesses another service's database. notifications-api asks preferences over HTTP.
- Inside a service, organize by feature: `src/notifications/`, `src/preferences/`. Layers: routes, controller, service, repository.
- The service layer depends on interfaces, and they are wired together in `src/app.ts` (composition root). `src/server.ts` only starts the server.

## Commands

- At the root: `npm run lint`
- In each service: `npm run dev`, `npm run build`, `npm run typecheck`
- In preferences: `npm run seed`
- Environment: WSL 2 with Ubuntu. The repo lives on the Linux filesystem, not under `/mnt/c`.

## Code rules

- Strict TypeScript, no `any`. External input, including responses from another service, goes through zod.
- ESM: relative imports use a `.js` extension, even when the file is `.ts`.
- Express 5: no need for `asyncHandler`. `req.query` is a getter and cannot be assigned to, so keep the parse result in a variable.
- Controller methods are arrow functions.
- Errors go through `AppError` and a single error handler, in the format defined in the spec. Convert library errors to `AppError`.
- Middleware order: `requestId → logger → express.json() → routes → 404 → errorHandler`.
- Logging with `console` only, until CA-02.
- MongoDB through Mongoose. Mongoose code lives only in `*.model.ts` and in the repository. The service layer does not know its types.
- Every schema uses `versionKey: false`, an explicit `collection`, and `timestamps` matching the fields in the spec.
- `aggregate` does not cast: an id in `$match` must be a `Types.ObjectId`. A string returns an empty result with no error.
- Validate an id from the URL before querying. Otherwise `findById` throws `CastError`, and the client gets 500 instead of 404.

## Do not

- Do not add a timeout, retry or `AbortSignal` to the preferences call. This is intentional (CA-16).
- Do not add a queue, sender, Docker, pino, Jest, `Idempotency-Key` or auth. These belong to later stages.
- Do not upgrade TypeScript beyond `~6.0`: typescript-eslint does not support 7.
- Do not run `npm audit fix --force`.
- Do not add a dependency without asking me first.
- Do not refactor anything unrelated to the task.

## Way of working

- Small, focused changes. If a task requires touching more than 3 files, stop and present a plan.
- Before saying you are done: `npm run typecheck` in the service and `npm run lint` at the root.
- Do not commit, push or perform branch operations. Those are mine.