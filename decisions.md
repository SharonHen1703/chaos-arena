# Decisions

What was chosen, what the options were, and why. `docs/spec.md` defines what we build, and this file explains the choices. Known limitations appear here along with how I would solve them.

## Architecture

### One repo with separate services (CA-01)
- **Chosen:** one repo, with `services/notifications-api` and `services/preferences`, each with its own `package.json`. No shared code package.
- **Why:** each service stands on its own, and the Dockerfiles in CA-02 stay simple.
- **Cost:** a small duplication of AppError and request id.

### One database per domain (CA-01)
- **Chosen:** `notifications` for notifications-api, and later for the sender too. `preferences` for the preferences service. Both databases sit on the same Mongo server, and each service connects only to its own.
- **Why:** database per service is about data ownership, not the number of processes. notifications-api and the sender are the same domain, so they share a database.

### preferences is thin on purpose (CA-01)
- **Chosen:** a separate service, even though at this size it could have been a module (modular monolith).
- **Why:** to create a synchronous HTTP dependency, where a cascading failure can happen. This is the basis for the faults in CA-05.
- **Cost:** one more network call, one more point of failure, and one more service.

### REST and JSON between services (HLD-03)
- **Chosen:** REST and JSON. **Rejected:** gRPC.
- **Why:** in this project it matters that messages can be read in the logs.

### No version in the URL (CA-01a)
- **Chosen:** `/notifications`. **Rejected:** `/v1/notifications`, planned in HLD-03.
- **Why:** there are no external clients. Changes are additive or use expand/contract.

### Local MongoDB Community (CA-01a)
- **Chosen:** local installation. **Rejected:** Atlas.
- **Why:** it works without internet and without an account. Atlas adds a network and an account, with no benefit at this stage.

## Data model and API

### Two levels: notification and delivery (HLD-03)
- **Chosen:** a notification has a `status` that describes progress (`processing`, `completed`, `cancelled`), and the outcome is in `counts`. Each recipient has a delivery with its own status (`queued`, `sent`, `skipped`, `failed`, `cancelled`) and a `reason`.
- **Rejected:** one status per notification, as written in the original plan.
- **Why:** a notification with many recipients has no single status. Cancelling does not erase history.

### `counts` computed with aggregation (CA-01a)
- **Chosen:** aggregation at read time, with the notification's `status` derived from it and not stored. **Rejected:** a counter with `$inc`.
- **Why:** `$inc` is a second write, so it drifts on retries and on a crash between the two writes.

### The name `delivery` (CA-01a)
- **Chosen:** `delivery`, the common term in notification systems.

### `202` for `POST /notifications` (BE-05)
- **Chosen:** a fixed `202`, not `201`.
- **Why:** the sending itself has not happened yet, and a fixed code keeps the client contract stable.

### Fan-out inside the request in CA-01 (CA-01a)
- **Chosen:** everything happens inside the request, and `202` returns only at the end. preferences is asked before any write.
- **Rejected:** background fan-out, planned in HLD-03, which needs a queue that has not been learned yet (BE-12).
- **Why:** a preferences failure leaves nothing in the DB, and the work stays short thanks to the 1,000 cap. A queue belongs where work is slow, unreliable, or done item by item against an external party.

### Unknown user (CA-01a)
- **Chosen:** `skipped` with `unknown_user`, and the rest of the request continues. An existing user means a user with a document in preferences.
- **Rejected:** `422` for the whole request, because one invalid user would fail the send for everyone else.

### Duplicates in `userIds` (CA-01a)
- **Chosen:** removed silently, and `total` counts unique users. The cap is checked before removal.

### Cap of 1,000 recipients per request (CA-01a)
- **Chosen:** in CA-01, `400` above 1,000 recipients, and `413` for a body over the `express.json()` limit (100KB). Measured: 1,000 UUID-length ids with a maximum-length `title` and `body` weigh about 48KB, so the limit does not catch a reasonable request.
- **In CA-03:** the cap is removed, leaving a body limit of 10MB (a few hundred thousand recipients), with `pending` and a fan-out queue separate from the send queue.
- **Why:** a limit on a request is not a limit on the product, and Firebase also limits a call to 500 devices. A queue solves the amount of work, not the size of the body. For millions, the list does not travel in the request at all.

### Invalid id in the URL (CA-01a)
- **Chosen:** `404`. **Rejected:** `400`.
- **Why:** from the client's point of view, no such resource exists.

### Cursor pagination (HLD-03)
- **Chosen:** a cursor based on `_id`, an opaque base64 string, and a `{ data, nextCursor }` response. `limit`: default 20, maximum 100.
- **Rejected:** offset.
- **Why:** a cursor requires sorting on a unique field, and `_id` is one.

### Translating another service's errors (HLD-03)
- **Chosen:** a preferences failure becomes `503 PREFERENCES_UNAVAILABLE`, in our own contract.
- **Rejected:** passing the preferences error to the client as is.

### preferences returns data and does not decide (HLD-03)
- **Chosen:** the "send or not" decision lives in notifications-api. `GET` and `PATCH` on `/users/:id/preferences`, and `POST /preferences/query` for fan-out.

### Repeated PATCH touches `updatedAt` (CA-01 task 4)
- **Chosen:** a repeated `PATCH /users/:id/preferences` with the same value keeps `optedOut` the same but updates `updatedAt`, because `timestamps` touches it on every update.
- **Rejected:** a filter with `optedOut: { $ne: optedOut }`, which updates only when the value changes.
- **Why:** idempotency here refers to the business state (`optedOut`), and `updatedAt` is metadata. With the filter, `null` from `findOneAndUpdate` would no longer mean "user not found", because it would also be returned when the value didn't change.

## Code

### Layers (BE-06)
- **Chosen:** controller, service and repository, organized by feature. The service depends on interfaces (`NotificationRepository`, `PreferencesClient`), and the composition root is `app.ts`.

### File names inside a feature folder (CA-01)
- **Chosen:** files are named by layer, with no feature prefix: `routes.ts`, `controller.ts`, `service.ts`, `repository.ts`, `schemas.ts`. A model keeps its entity prefix (`preference.model.ts`, `notification.model.ts`, `delivery.model.ts`), because one folder can hold several entities. Class names keep the full name (`PreferencesService`), because they are imported side by side in `app.ts`.
- **`interfaces.ts`:** the contracts the service depends on (`PreferencesRepository`, later `PreferencesClient`), and the domain types those contracts take and return (`UserPreferences`). Types inferred from zod stay in `schemas.ts`, and Mongoose types stay in the model. The service itself has no interface: the controller imports the class.
- **Rejected:** `<feature>.<layer>.ts` (`preferences.service.ts`), the NestJS style.
- **Why:** the folder already names the feature, so the prefix repeats the path. Importing from `interfaces.ts` shows that the service does not know the implementation.
- **Cost:** several open tabs named `service.ts`, and searching by file name needs the folder too (`preferences/service`).

### Uniform error format (BE-06)
- **Chosen:** `{ error: { code, message, requestId, details? } }`. On 500 the message is generic (`INTERNAL_ERROR`), and the full details go to the log with the request id.

### Request id (BE-06)
- **Chosen:** the `x-request-id` header. If it is invalid (`/^[\w-]{1,64}$/`), a new id is generated, and we do not return `400`. The id is returned in a response header.

### Validation with zod (BE-06)
- **Chosen:** a `validateBody` middleware, with `400 VALIDATION_ERROR` and `details`.
- **Why:** zod checks shape, and business rules live in the service. TypeScript types do not exist at runtime, and zod strips undefined fields, which protects against mass assignment.

### Normalizing `PREFERENCES_URL` in config (CA-01 task 5)
- **Chosen:** `config.ts` validates `PREFERENCES_URL` with `z.url({ protocol: /^https?$/ })` and removes trailing slashes. The client joins paths with a template string.
- **Rejected:** `new URL(path, base)` in the client, because it drops a path in the base (`new URL('/preferences/query', 'http://host/api')` loses `/api`).
- **Why:** a plain `z.url()` accepts `localhost:3001` (it parses `localhost:` as a scheme), so a broken value would only fail on the first call to preferences. Now it fails at startup, along with the other variables.

### Converting library errors (BE-06)
- **Chosen:** broken JSON and an oversized body are handled in the error handler, and Mongo's `E11000` in the repository. All of these become `AppError`.

### Broken JSON and oversized body in the error handler (CA-01 task 2)
- **Chosen:** broken JSON returns `400 VALIDATION_ERROR` with the message "Request body is not valid JSON" and no `details`. An oversized body returns `413 PAYLOAD_TOO_LARGE`. Both are created as an inline `AppError` in the error handler, with no new subclass.
- **Rejected:** `ValidationError([])` with "Invalid request body". The practice project's `INVALID_JSON` code, which the spec does not allow.
- **Why:** broken JSON has no fields to list, and its own message tells it apart from a schema failure. These are the only two places that create these errors, so a class adds nothing.

### Middleware order and Express 5 (BE-06)
- **Chosen:** `requestId → logger → express.json() → routes → 404 → errorHandler`. The logger comes before `express.json()`, so a request with broken JSON is logged too. Express 5, with `app.disable('x-powered-by')`.

### Middleware names (CA-01)
- **Chosen:** verb names that say what the middleware does: `assignRequestId`, `logRequest`, `handleError`. `notFound` keeps its name. File names stay as they are (`requestId.ts`, `logger.ts`, `errorHandler.ts`).
- **Rejected:** noun names (`requestId`, `logger`, `errorHandler`), the common Express style.
- **Why:** in `app.use(requestId)` the function is passed, not called, so a noun reads like a constant value. The middleware order in the spec and above names stages, not functions, so it stays as written.

### Controller methods as arrow functions (BE-06)
- **Chosen:** arrow functions, with `@typescript-eslint/unbound-method` enabled.
- **Why:** passing a method as a callback detaches `this`, and TypeScript does not catch it.

## Decided during repo setup (CA-01b)

### Mongoose
- **Chosen:** Mongoose. **Rejected:** the official `mongodb` driver.
- **Why:** my preference. It provides `timestamps`, casting, and a schema that documents the shape of a document.
- **Division of roles:** zod checks input at the edge, including length rules. The Mongoose schema defines the shape of a document. Mongoose stays in the model and the repository, and the service does not see it.
- **Fixed settings:** `versionKey: false`, an explicit `collection` name, and `timestamps` matching the fields in the spec. This way documents match the tables exactly, with no `__v`.
- **Cost:** another layer that hides some of the queries, and traps to know about. For example, `aggregate` does not cast: a string in `$match` returns an empty result with no error. In CA-03 the `deliveries` schema will be duplicated in the sender, because there is no shared package.

### ESM with NodeNext
- **Chosen:** `"type": "module"` and `moduleResolution: NodeNext`, with a `.js` extension on relative imports.
- **Rejected:** `moduleResolution: Bundler`, as used in express-playground.
- **Why:** with Bundler, `tsc` compiles imports without an extension, and Node cannot run the output. `tsx` hides this during development, so the problem only shows up in the build. With NodeNext, `tsc` stops on it immediately.

### TypeScript `~6.0`
- **Chosen:** TypeScript 6.0. **Rejected:** the latest version, 7.0.
- **Why:** `typescript-eslint` supports up to `<6.1.0`, and without it there is no `unbound-method`.

### Developing inside WSL 2
- **Chosen:** the repo, Node, Claude Code and MongoDB inside Ubuntu on WSL 2, in `~/projects`. **Rejected:** Windows with Git Bash, or a repo under `/mnt/c`.
- **Why:** Docker recommends keeping bind-mounted code there. Performance is higher, and file change events reach the container only from there, which is what triggers `tsx watch` inside it.
- **Cost:** a one-time tool installation. Windows Mongo is not reachable from WSL through `localhost`, so it is installed inside Ubuntu until CA-02.

### npm without workspaces
- **Chosen:** a separate lock file for each service, and one at the root for ESLint.
- **Why:** each service is built separately in CA-02.
- **Cost:** `npm ci` runs at the root and in each service. ESLint also needs the service's `node_modules` to read its types.

### Node's `--env-file-if-exists`
- **Chosen:** Node's built-in flag. **Rejected:** dotenv.
- **Why:** one dependency fewer. Without `.env` the service continues, and the zod env check prints which variables are missing. The same applies in Docker, where the values come from Compose.

### `serverSelectionTimeoutMS` of 2 seconds
- **Chosen:** 2 seconds on the Mongo connection in both services.
- **Why:** the default is 30 seconds, which would leave `GET /health` stuck for half a minute when Mongo is down, instead of returning `503`. Measured: 2 seconds with this setting. This does not contradict "no timeout": that decision concerns only the preferences call.

### `503` body for `GET /health`
- **Chosen:** `{ "status": "unavailable" }`.
- **Why:** the spec defined only the code. The same shape as `{ "status": "ok" }` is simpler for a health-checking tool.

### What counts as a preferences failure
- **Chosen:** anything other than a valid `2xx` gets `503`: connection failure, `5xx`, `4xx`, broken JSON, or an unexpected shape (checked with zod).
- **Why:** the spec's error table says "did not receive a valid response", which is broader than the flow step, which mentions only connection failures and `5xx`. The broader reading stays: a `4xx` from preferences is a bug on our side, and the client cannot fix it.

### Cap on `POST /preferences/query`
- **Chosen:** 1 to 1,000 ids, with a separate constant in preferences.
- **Why:** the spec set no cap. This is the same size as the chunks planned for CA-03.

## Planned for later stages

These decisions were made in the learning sessions. They enter the code in the stages listed.

### Idempotency (CA-03)
- A unique index in Mongo, not a lock, because a lock works only inside one process. Try to create, and catch `E11000`.
- A retry with the same key and the same body gets the same response. The same key with a different body gets an error, using a hash of the body stored with the key. **Open:** `422` or `409`.
- Along the chain: a unique index on `{ notificationId, userId }`, `jobId = deliveryId` in BullMQ, and `deliveryId` as the idempotency key with the provider. Inside the system we use natural ids, not an id generated anew on every run.

### Rate limiting (CA-03)
- A recipient over the quota gets `202` and a `skipped` status with `reason: 'rate_limited'`, not `429`. Important notifications (verification codes, order confirmations) are exempt. Deferral and digest were considered and not chosen.

### Sender retry policy (CA-03)
- `4xx` gets `failed` immediately, `429` waits for `Retry-After`, `5xx` uses backoff with a limited number of attempts, and a timeout is retried only with an idempotency key toward the provider.

### Additional endpoints (CA-03 and later)
- `POST /notifications/:id/cancel`: returns `200` on a repeated call too, and `409` if already sent.
- `GET /deliveries?userId=`.
- fake-provider: `POST /send`. Returns `200` with `providerMessageId`, and `429` with `Retry-After`. On a repeated key it returns the same response.
- sender: only `/health`, which checks that it is really processing. It writes directly to the same Mongo, because it is the same domain.

### Fan-out function boundary (to review in CA-03)
- The spec puts steps 3 to 6 in one function, so it can be replaced by enqueuing. But `202` returns a body with an `id`, so in CA-03 saving the notification (step 5) will have to happen before enqueuing. In CA-01 this changes nothing.

### Dashboard and CORS (stage 5)
- SSE for the stream, and `POST` for buttons. Every event has an `id`, and `Last-Event-ID` fills in what was missed after a disconnect.
- CORS is needed only for the dashboard, because it is a browser on another origin. It is not needed between services.
- **Open:** how agent events reach the service that holds the SSE: HTTP to the judge, Redis pub/sub, or the agent inside the judge's process.

### AI (stages 4-5)
- **No RAG:** RAG solves the case where there is more information than can be sent to the model. Here all fault types fit in the prompt, and old incident reports repeat the same types.
- **No LLM-as-judge:** the fault is injected, so the correct answer is known and checked in code.
- **Workflow vs agent:** the judge's round is a workflow with fixed steps. The SRE agent is an agent, because the next step in an investigation depends on what was found. The proof in numbers: the baseline comparison in CA-10.
- **Attacker without an LLM:** it picks faults using statistics of the agent's failures. This does the job without adding an AI component just for the story.

## Options to consider

- **`audience`:** a filter instead of a list, for example "everyone who has not opted out". The fan-out finds the users itself in preferences, in chunks of 1,000, so there is no body size limit. This is the way to reach millions of recipients.

## Known limitations

### Double write in fan-out
- **The problem:** saving the notification and the `insertMany` are two separate operations. A crash between them leaves a notification with no deliveries, which stays `processing` forever.
- **How I would solve it:** this is the same family as the dual write problem from CA-03. The known solution is a transactional outbox. Within one database a transaction is also possible, but it requires a replica set, and the local Mongo runs as a single server.

### No timeout toward preferences
- **The problem:** when preferences is slow, `POST /notifications` hangs with it. This is intentional: the fault is experienced in CA-05, diagnosed in CA-06 and fixed in CA-16.
- **What actually happens:** Node's `fetch` has a built-in limit of 300 seconds for waiting on headers. Measured against a server that never answers: after 301 seconds it fails with `fetch failed`, and the reason is in `err.cause` (`UND_ERR_HEADERS_TIMEOUT`). So the request hangs for 5 minutes, and then `503` returns.
- **How I would solve it:** a short timeout and a circuit breaker, with a fallback to cached preferences.

### Typo in a `userId`
- **The problem:** a typo in a single recipient does not return an error right away. The client sees `skipped` with `unknown_user` only when asking for the status.
- **Why this is acceptable:** it is the price of deciding that one user does not fail the whole request.

### Opt-out blocks all notifications
- **The problem:** CA-01 does not distinguish between notification types, so a user who opted out will not receive a verification code either. In a real product, opt-out applies only to marketing messages.
- **How I would solve it:** solved in CA-03, when priority is added.

### Auth between services
- **The problem:** anyone who reaches the network can call preferences.
- **How I would solve it:** an internal network and a service token in `Authorization`. Not part of the project's core.

### Real provider without idempotency
- **The problem:** protection against double sending relies on a key with the provider. Checking the status before sending is only an optimization, because sending and recording do not happen together. A provider that does not support a key leaves the risk open.