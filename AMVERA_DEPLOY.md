# HydroPulse: Amvera deployment

## What was prepared

- `Dockerfile` builds the React app and runs the Express API from one container.
- `amvera.yml` tells Amvera to build that Dockerfile and route traffic to port `3001`.
- `apps/api/server.js` serves `apps/api/public/index.html` when the React build exists.
- `apps/web/src/api/hydropulse_api.js` uses same-origin `/api/...` in production, so the public Amvera URL works without a hardcoded API host.
- `.dockerignore` keeps local dependencies, Arduino files, and database backups out of the Docker build context.

## Amvera steps

1. Create a PostgreSQL service in Amvera.
2. Restore one of the backups from `database/` into that PostgreSQL service.
3. Create an application service in Amvera.
4. Upload or push this repository to the application service.
5. In the application environment variables, set:

```env
AUTH_SECRET=use_a_long_random_secret
DATABASE_HOST=your_amvera_postgres_host
DATABASE_PORT=5432
DATABASE_NAME=your_database_name
DATABASE_USER=your_database_user
DATABASE_PASSWORD=your_database_password
DATABASE_SSL=false
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=use_a_strong_password
DEFAULT_VIEWER_USERNAME=viewer
DEFAULT_VIEWER_PASSWORD=use_a_strong_password
NOTIFICATIONS_ENABLED=false
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_BOT_POLLING=false
```

If you enable Telegram, also set `NOTIFICATIONS_ENABLED=true`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and optionally `TELEGRAM_ALLOWED_CHAT_IDS`.

## Git cleanup

`apps/api/node_modules` was removed from the git index and added to ignore rules. The files can remain on your disk, but they should not be committed or uploaded to Amvera. To commit the deployment preparation from the current working tree:

```powershell
git commit -m "Prepare Amvera deployment"
```

## Local checks

Build the frontend:

```powershell
cd apps/web
npm.cmd ci
npm.cmd run build
```

Start the API locally:

```powershell
cd apps/api
npm.cmd ci
npm.cmd start
```

For a full container check:

```powershell
docker build -t hydropulse-amvera .
docker run --rm -p 3001:3001 --env-file apps/api/.env hydropulse-amvera
```

Then open `http://localhost:3001`.
