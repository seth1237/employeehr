---
description: Install dependencies and run the application
---

# Install and Run Workflow

1. Install frontend dependencies
```bash
pnpm install
```

2. Install backend dependencies
```bash
cd server
pnpm install
```

3. Create backend .env file (if not exists)
```bash
if [ ! -f server/.env ]; then
  echo "PORT=5000" > server/.env
  echo "MONGODB_URI=mongodb://localhost:27017/elevate" >> server/.env
  echo "FRONTEND_URL=http://localhost:3000" >> server/.env
  echo "JWT_SECRET=dev_secret_key_123" >> server/.env
  echo "Created server/.env"
fi
```

4. Start Backend (in background or separate terminal recommended, but for this workflow we'll just show the command)
> [!NOTE]
> You should run the backend in a separate terminal:
> `cd server && pnpm dev`

5. Start Frontend
> [!NOTE]
> You should run the frontend in a separate terminal:
> `pnpm dev`
