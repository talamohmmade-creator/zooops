# ZooOps Backend Database Setup

This folder contains the first backend step for the ZooOps app: the MongoDB database structure.

## What we created

- `Role` - role permissions like Keeper, Supervisor, Management, Admin
- `User` - login users connected to roles
- `Zone` - zoo zones such as Zone 1 or Zone 4
- `Enclosure` - animal areas inside zones
- `Animal` - animal profiles and behavior baselines
- `Task` - keeper/supervisor/manager task workflow
- `Evidence` - uploaded notes, photos, videos, PDFs, and files
- `Comment` - task comments and mentions
- `MentionThread` - Asana-like chat threads linked to a task
- `CalendarReminder` - reminders that can create tasks
- `Notification` - inbox alerts for mentions, task updates, and approvals

## Step 1: Install Node packages

Open terminal in this folder:

```bash
cd backend
npm install
```

## Step 2: Create `.env`

Copy `.env.example` and rename it to `.env`.

For local MongoDB:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/zooops
JWT_SECRET=change_this_to_a_long_secret_key
CLIENT_URL=http://localhost:3000
```

For MongoDB Atlas, replace `MONGODB_URI` with your Atlas connection string.

## Step 3: Seed sample data

```bash
npm run seed
```

This creates sample roles, users, zones, enclosures, animals, tasks, evidence, comments, mentions, reminders, and notifications.

## Step 4: Run the backend

```bash
npm run dev
```

Test it in the browser:

```text
http://localhost:5000/api/health
```

You should see:

```json
{
  "status": "ok",
  "message": "ZooOps backend is running"
}
```

## Test users

All sample users use password:

```text
Password123
```

Users:

```text
keeper@zooops.local
supervisor@zooops.local
manager@zooops.local
admin@zooops.local
```

## Next backend step

After this database setup, the next step is to build:

1. Authentication routes
2. Permission middleware
3. Task API routes
4. Evidence upload API routes
5. Comment and mention chat routes
6. Frontend connection to these APIs
