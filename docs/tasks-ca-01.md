# CA-01: Tasks for Claude Code

11 tasks, in order. Each one is a single PR. They point to the spec, and repeat it only for details a prompt or a check needs. When there is a conflict, `docs/spec.md` wins.

**Legend:** ✍️ a suggestion to write it yourself, with Claude Code only doing a review.

## One-time setup

Everything runs inside Ubuntu on WSL 2. The repo lives in `~/projects/chaos-arena`, on the Linux filesystem, not under `/mnt/c`.

### 1. WSL (in PowerShell as Administrator, once)

```powershell
wsl --install -d Ubuntu-24.04
wsl --set-default Ubuntu-24.04
```

Restart if asked, open Ubuntu, and choose a username and password. From here on, everything happens in the Ubuntu terminal. To enter it from PowerShell: `wsl -d Ubuntu-24.04 --cd ~`.

### 2. Tools inside Ubuntu

```bash
sudo apt update && sudo apt install -y git unzip  # terminal
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash  # terminal
source ~/.bashrc                           # terminal: loads nvm
nvm install 22                             # terminal
node -v                                    # peek: needs 22.13 or later
which node                                 # peek: must start with /home/<user>/.nvm
which npm                                  # peek: must start with /home/<user>/.nvm
curl -fsSL https://claude.ai/install.sh | bash  # terminal
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc  # terminal
claude --version                           # peek: prints a version number
```

Run `claude` to sign in. Windows settings do not carry over, so recreate `~/.claude/settings.json` with `defaultMode: "default"`, as in AI-00.

### 3. MongoDB inside Ubuntu

```bash
sudo apt-get install -y gnupg curl         # terminal
curl -fsSL https://pgp.mongodb.com/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor  # terminal
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list  # terminal
sudo apt-get update                        # terminal
sudo apt-get install -y mongodb-org        # terminal
sudo systemctl enable --now mongod         # terminal
mongosh --quiet --eval 'db.runCommand({ ping: 1 })'  # peek: needs ok: 1
```

A Mongo installed on Windows is not reachable from WSL through `localhost`, so it has to run here. Compass on Windows can connect to it through `localhost:27017`, as long as no Mongo is also running on Windows.

### 4. The repo and Git

1. On GitHub: Settings → Emails, check "Keep my email addresses private" and copy the noreply address.
2. In the Ubuntu terminal:

```bash
mkdir -p ~/projects && cd ~/projects       # terminal
unzip /mnt/c/Users/<WINDOWS_USER>/Downloads/chaos-arena.zip  # terminal
cd chaos-arena                             # terminal
git config --global user.name "<NAME>"     # Git
git config --global user.email "<NOREPLY_EMAIL>"  # Git
git config --global credential.helper "/mnt/c/Program\ Files/Git/mingw64/bin/git-credential-manager.exe"  # Git
git init -b main                           # Git
npm ci                                     # terminal
npm run lint                               # terminal: must pass with no errors
git add .                                  # Git
git status                                 # Git: make sure there is no node_modules or .env
git commit -m "chore: repo skeleton, spec and decisions"  # Git
```

3. On GitHub: a new repo named `chaos-arena`, public, with no README, no `.gitignore` and no license.

```bash
git remote add origin https://github.com/<GITHUB_USER>/chaos-arena.git  # Git
git push -u origin main                    # Git: a browser opens for sign-in
```

4. Repo settings on GitHub:
   - **Settings → General → Pull Requests:** only Allow squash merging, and check Automatically delete head branches.
   - **Settings → Branches:** a rule on `main` with Require a pull request before merging. The number of approvals is 0, because you cannot approve your own PR. Status checks are added in CA-04.

### 5. VS Code

Install the WSL extension on Windows, and run `code .` from the project folder in the Ubuntu terminal. The VS Code terminal will then be an Ubuntu terminal.

## The cycle of every task

```text
0. git switch main && git pull, then git switch -c <branch>
1. /clear, then plan mode: paste the prompt and read the plan before approving
2. Execute in Manual
3. Verify: go through "Done =" yourself. First it works, then you read it
4. git diff: every line. If you cannot explain it, ask
5. git commit, push, PR and squash merge (you, not it)
```

## preferences

### 1. Service skeleton

branch: `feat/preferences-skeleton`

```text
Create services/preferences:
- package.json with "type": "module" and engines of node >=22.13.0.
  scripts:
    dev: tsx watch --env-file-if-exists=.env src/server.ts
    build: tsc
    start: node --env-file-if-exists=.env dist/server.js
    typecheck: tsc --noEmit
  dependencies: express, zod
  devDependencies: typescript@~6.0.3, @types/node@22, @types/express@5, tsx
- tsconfig.json extending ../../tsconfig.base.json, with rootDir: src, outDir: dist, include: ["src"].
- .env.example according to the "Environment configuration" table in the spec.
- src/config.ts: env validation with zod. When something is missing, print which variables and exit with code 1.
- src/app.ts: exports createApp(), which returns the Express app, with app.disable('x-powered-by').
- src/server.ts: calls createApp and listens on the port.
- One route: GET /health that returns { "status": "ok" }, with no Mongo check yet.

No middleware, no Mongo and no additional files. Those are separate tasks.
```

**Done =**
- `cp .env.example .env`, then `npm run dev`. `curl -i localhost:3001/health` returns `200` with `{"status":"ok"}`.
- `npm run build && node dist/server.js` stops with a message naming `PORT` and `MONGO_URL`. Run this way, without the flag, Node does not load `.env`.
- `npm run typecheck`, and at the root `npm run lint`.

### 2. Middleware chain and error handling ✍️

branch: `feat/preferences-middleware`

This is the code you practiced in BE-06. Before starting, copy the relevant files from `/mnt/c/Users/<WINDOWS_USER>/express-playground` to `services/preferences/src/shared/`. The errorHandler and the 404 handler are the candidates for writing yourself. The tsconfig here is stricter, so imports will need a `.js` extension.

```text
services/preferences/src/shared/ contains files I copied from a practice project. Adapt them to the spec, section "Errors, request id and configuration", and wire them in app.ts according to "Middleware order":
- requestId: according to the regex in the spec. The id is returned in a response header.
- logger: one console line per request, with method, path, status, duration and request id.
- 404 handler.
- errorHandler: handles AppError, type 'entity.parse.failed' (400 VALIDATION_ERROR) and type 'entity.too.large' (413 PAYLOAD_TOO_LARGE). Everything else is 500 INTERNAL_ERROR, with a generic message, and the full error in the log with the request id. If res.headersSent, pass to next(err).

No new routes. Do not change the error format in the spec.
```

**Done =**
- `curl -i localhost:3001/nope` returns `404` in the uniform format.
- `curl -i -X POST localhost:3001/nope -H 'content-type: application/json' -d '{bad'` returns `400 VALIDATION_ERROR`.
- A large body returns `413`:
  ```bash
  node -e "console.log(JSON.stringify({userIds:['x'.repeat(200000)]}))" > big.json  # terminal
  curl -i -X POST localhost:3001/nope -H 'content-type: application/json' --data-binary @big.json  # peek
  rm big.json                                # terminal
  ```
- `curl -i -H 'x-request-id: abc-123' localhost:3001/health` returns `abc-123` in the header.
- `curl -i -H 'x-request-id: bad id!' localhost:3001/health` returns a different id.

**In the diff:** four parameters in errorHandler. `return` after sending a response. The logger before `express.json()`.

### 3. Mongo connection, health and seed

branch: `feat/preferences-mongo`

```text
In services/preferences:
- Add the mongoose dependency.
- src/db.ts: connect with mongoose.connect, with serverSelectionTimeoutMS: 2000. The database name comes from MONGO_URL.
- src/preferences/preference.model.ts: interface, schema and model according to "Data model" in the spec. _id of type String, with versionKey: false, collection: 'preferences' and timestamps: { createdAt: false, updatedAt: true }.
- createApp becomes async, receives config and connects to Mongo. If the connection fails, the service stops.
- GET /health: ping with mongoose.connection.db?.admin().ping(). Success returns 200 with { "status": "ok" }. Failure, or a missing db, returns 503 with { "status": "unavailable" }.
- src/seed.ts and a seed script: "tsx --env-file-if-exists=.env src/seed.ts".
  Upsert u1 (optedOut: false) and u2 (optedOut: true) with PreferenceModel.updateOne. A repeated run returns them to the same state and creates no duplicates. Finish with mongoose.disconnect(), otherwise the process does not exit.

No preferences endpoints. They are in the next task.
```

**Done =**
- `npm run seed` twice, and the command returns to the prompt by itself. In `mongosh preferences --eval 'db.preferences.find()'` (or in Compass) there are exactly two documents, with no `__v`.
- `/health` returns `200`. After `sudo systemctl stop mongod` it returns `503` within about 2 seconds, and without Mongo the service does not start. At the end, `sudo systemctl start mongod`.

### 4. preferences endpoints

branch: `feat/preferences-endpoints`

```text
Implement in services/preferences the three endpoints from the spec, section "preferences endpoints":
POST /preferences/query, GET /users/:id/preferences, PATCH /users/:id/preferences.

Structure: src/preferences/ with schemas, routes, controller, service and repository (interface and Mongoose implementation). Reads use .lean().
- validateBody with zod, and details on 400.
- POST /preferences/query: userIds is 1 to 1,000 non-empty strings.
- PATCH: findOneAndUpdate without upsert, with returnDocument: 'after'. updatedAt is updated through timestamps. A nonexistent user gets 404.
- Responses use userId, not _id.
```

**Done =**
- `curl -X POST localhost:3001/preferences/query -H 'content-type: application/json' -d '{"userIds":["u1","u2","u3"]}'` returns `u1` and `u2`, and `u3` is missing.
- `POST` with `{"userIds":[]}` returns `400` with `details`.
- `GET /users/u2/preferences` returns `200`, and `GET /users/nope/preferences` returns `404`.
- `PATCH /users/u1/preferences` with `{"optedOut":true}` twice gives the same result. `PATCH /users/nope/preferences` returns `404`, and no document is created.
- `npm run seed` at the end, to return to the known state.

**In the diff:** controller methods as arrow functions. No Mongoose code outside the model and the repository.

## notifications-api

### 5. Service skeleton

branch: `feat/notifications-skeleton`

```text
Create services/notifications-api, with the same structure as services/preferences: package.json, tsconfig, .env.example, config, app, server, src/shared and src/db.ts.
Copy the common code. Do not create a shared package.
- PORT, MONGO_URL and PREFERENCES_URL according to the spec.
- GET /health with a Mongo ping, as in preferences.
- Add a PREFERENCES_UNAVAILABLE (503) error to shared.

No notifications endpoints.
```

**Done =**
- `curl -i localhost:3000/health` returns `200`.
- `curl -i localhost:3000/nope` returns `404` in the uniform format.
- Both services run together, in two terminals.

### 6. PreferencesClient

branch: `feat/preferences-client`

```text
In services/notifications-api/src/notifications/ add:
- An interface named PreferencesClient, with getPreferences(userIds: string[]) that returns a Map from userId to { optedOut: boolean }.
- An HttpPreferencesClient implementation using the global fetch, which calls POST /preferences/query.

Behavior:
- A valid response: status 2xx and a body that passes zod.
- Anything else is a failure: connection error, 4xx, 5xx, broken JSON or an unexpected shape. In that case log the reason (including err.cause) and throw the PREFERENCES_UNAVAILABLE error.
- No timeout, no AbortSignal and no retry. This is intentional, see "The POST /notifications flow" in the spec.
```

**Done =**
- A temporary file `src/try-client.ts`, not committed, calls the client and prints the Map. Run: `npx tsx --env-file=.env src/try-client.ts`. The idea can come from `try-service.ts` in BE-06.
- With preferences up: `u1` and `u2`, and `u3` is missing.
- With preferences down: an error with the code `PREFERENCES_UNAVAILABLE`, and `err.cause` is visible in the log.

### 7. NotificationRepository

branch: `feat/notifications-repository`

```text
In services/notifications-api/src/notifications/ add, according to "Data model" in the spec:
- notification.model.ts: versionKey: false, collection: 'notifications', timestamps: { createdAt: true, updatedAt: false }.
- delivery.model.ts: versionKey: false, collection: 'deliveries', timestamps: true, and the two indexes from the spec defined in the schema. reason is optional.
- An interface named NotificationRepository and a Mongoose implementation, which works with the service using string ids and converts them internally:
  - insertNotification, insertDeliveries (one insertMany), findNotificationById
  - countDeliveriesByStatus: an aggregate of $match by notificationId followed by $group by status. aggregate does not cast, so notificationId must be a Types.ObjectId.
  - listDeliveries(notificationId, afterId, limit): sorted by _id in ascending order, with .lean()
  - ensureIndexes: await DeliveryModel.init(). createApp calls it on startup, and a failure stops the service.

No routes and no business logic.
```

**Done =**
- After the service starts, `mongosh notifications --eval 'db.deliveries.getIndexes()'` shows the two indexes, the first one `unique`.
- A repeated start does not fail.
- `npm run typecheck`.

**In the diff:** `Types.ObjectId` in `$match`. With a string, `aggregate` returns an empty result with no error, so `counts` are 0 and the notification is stuck in `processing`. Tested: this really happens.

### 8. `POST /notifications` ✍️

branch: `feat/create-notification`

The two pure functions are the candidates for writing yourself: `decideDelivery` according to "Status rules", and `deriveStatus`. They have no I/O, and they are the business core of the service.

```text
Implement POST /notifications according to the spec: "POST /notifications" and "The POST /notifications flow".
- schemas: a constant MAX_RECIPIENTS_PER_REQUEST = 1000. The cap is checked in zod, before removing duplicates.
- service, following the order of steps in the spec. Steps 3 to 6 in a separate function.
- getNotification in the service: returns the GET /notifications/:id body, with counts that always contain queued and skipped, even with 0.
- controller: 202, a Location header, and the body from getNotification.
- Wiring in app.ts: repository, HttpPreferencesClient and service.

No GET routes. They are in the next tasks.
```

**Done =**
- With preferences up: `POST` with `u1`, `u2`, `u3` returns `202`, `Location`, `total: 3`, `counts: {queued:1, skipped:2}` and `status: "processing"`.
  ```bash
  curl -i -X POST localhost:3000/notifications -H 'content-type: application/json' -d '{"userIds":["u1","u2","u3"],"title":"hi","body":"there"}'  # peek
  ```
- Duplicates: `["u1","u1","u2"]` gives `total: 2`.
- All `skipped`: `["u2","u3"]` gives `status: "completed"`.
- 1,001 ids return `400`, and after changing `length` to 1000, `202` returns:
  ```bash
  node -e "console.log(JSON.stringify({userIds:Array.from({length:1001},(_,i)=>'u'+i),title:'t',body:'b'}))" > many.json  # terminal
  curl -i -X POST localhost:3000/notifications -H 'content-type: application/json' --data-binary @many.json  # peek
  rm many.json                               # terminal
  ```
- With preferences down: `503 PREFERENCES_UNAVAILABLE`, and the number of documents in `notifications` does not change.

**In the diff:** the order of the flow: preferences is asked before any write. No `status` in the `notifications` document. Exactly one delivery is created for each unique user.

### 9. `GET /notifications/:id`

branch: `feat/get-notification`

```text
Add GET /notifications/:id according to the spec, on top of the existing getNotification.
- An id that is not a valid ObjectId returns 404 NOT_FOUND. The check is in findNotificationById with mongoose.isObjectIdOrHexString, and it returns null. Without the check, Mongoose throws CastError and the client gets 500.
- A valid id that does not exist returns 404 NOT_FOUND.
```

**Done =**
- The address from `Location` returns the same body as the `POST`.
- `/notifications/abc` returns `404`, and so does `/notifications/507f1f77bcf86cd799439011`.

### 10. `GET /notifications/:id/deliveries`

branch: `feat/list-deliveries`

```text
Add GET /notifications/:id/deliveries according to the spec.
- A notification that does not exist or an invalid id: 404.
- query with zod: limit is an integer from 1 to 100, default 20. In Express 5 you cannot write to req.query, so parse inside the controller.
- cursor: base64 of the last _id on the page. A cursor that does not decode to 24 hex characters returns 400 VALIDATION_ERROR. The check uses a regex in zod, so the controller does not depend on Mongoose.
- Fetch limit + 1 documents, to know whether there is another page. On the last page nextCursor is null.
- Each item: id, userId, status, createdAt, and reason only if it exists.
```

**Done =**
- `POST` with 25 ids. `limit=10` gives three pages, 10, 10 and 5, with no duplicates. On the third page `nextCursor` is `null`.
- `POST` with 20 ids and `limit=10`: on the second page `nextCursor` is `null`, with no empty third page.
- `limit=0`, `limit=101` and `cursor=abc` return `400`.
- The `delivery` of `u1` has no `reason`, and that of `u2` has `reason: "opted_out"`.

### 11. Acceptance test

branch: `chore/ca-01-acceptance`

Run these checks yourself, without Claude Code. With both services running, and after `npm run seed`:

```bash
curl -i localhost:3000/health              # peek
curl -i localhost:3001/health              # peek
curl -i -X POST localhost:3000/notifications -H 'content-type: application/json' -d '{"userIds":["u1","u2","u3"],"title":"hi","body":"there"}'  # peek
curl -i localhost:3000/notifications/<id>  # peek
curl -i localhost:3000/notifications/<id>/deliveries  # peek
```

Stop preferences and send the `POST` again. Expect `503`, and check that the number of documents did not change:

```bash
mongosh notifications --eval 'db.notifications.countDocuments()'  # peek
```

Then:
- Check off the five acceptance items in `docs/spec.md`.
- Add decisions made along the way to `decisions.md`.
- Update "Running" in the README: `npm ci` in each service, `npm run seed`, and two terminals.
- `npm run build` in both services, then `npm start`. This confirms that the compiled code runs too, not only `tsx`.

## Intentionally left out

- Automated tests: they arrive in CA-04, after BE-13.
- Converting `E11000` to `AppError`: in CA-01 the unique index cannot be violated, because duplicates are removed and every notification is new. It comes in CA-03, with `Idempotency-Key`.
- Graceful shutdown: CA-03.