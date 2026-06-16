# Almstead - Priorities

Almstead - Priorities is a modern, real-time task and priority management application designed to handle operational workflows, branches, and arborist priorities. The application allows teams to organize their tasks across different lists (e.g., specific branches or arborists), track activity, and integrate with external systems like HubSpot and Acorn.

## Features

- **Real-time Synchronization:** Built with Supabase Realtime to instantly broadcast task updates (creates, updates, deletes) to all connected clients.
- **Role-Based Access Control:** Users are assigned roles (`member`, `manager`, `admin`) to ensure the appropriate level of permissions across lists and tasks.
- **Drag & Drop Ordering:** Uses `@dnd-kit` to allow users to manually sort and prioritize items.
- **Rich Text Notes:** Integrates `@tiptap/react` for rich text editing on task notes.
- **Third-Party Integrations:** Supports webhooks for seamless data flow from external CRMs and systems like HubSpot and Acorn.
- **Analytics:** Integrated with Amplitude for event tracking (e.g., list views, item creation).
- **Modern Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, and TypeScript.

## Architecture

- **Frontend:** Next.js (App Router), React, Tailwind CSS.
- **Backend/Database:** Supabase (PostgreSQL).
- **Authentication:** Supabase Auth (with Google OAuth integration).
- **State Management:** React state + Supabase Realtime subscriptions.

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- npm or yarn
- A Supabase project

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Almstead---Priorities
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key # For server-side admin operations
   NEXT_PUBLIC_AMPLITUDE_API_KEY=your-amplitude-api-key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Database Schema Overview

- `users`: Extends Supabase auth users with roles (`member`, `manager`, `admin`) and active status.
- `branches`: Represents physical or organizational branches.
- `lists`: Categorizes tasks by branch or arborist.
- `items`: The core tasks/priorities, linked to a list, with status, sorting, and metadata.
- `item_images`: Attachments for tasks.
- `item_links`: External links tying a task to systems like HubSpot or Acorn.
- `activity_log`: Tracks actions (created, edited, completed, etc.) on items for auditing.

*(Refer to `supabase/migrations/00001_initial_schema.sql` and `src/lib/types.ts` for details).*

---

## What Else is Needed for Completion

While the core functionality is in place, the following areas require completion or refinement before a production release:

### 1. Robust User Provisioning
- **Current State:** The app falls back to assigning a default "admin" role to users during development if they aren't in the `public.users` table.
- **To-Do:** Implement a Supabase Auth Trigger (or Webhook) to automatically create a `public.users` record with the appropriate default role (`member`) when a new user signs up via Google Auth.

### 2. File Uploads / Attachments
- **Current State:** The database schema supports `item_images`, but the frontend UI and Supabase Storage bucket configurations need to be finalized.
- **To-Do:** Setup Supabase Storage buckets, configure RLS policies for storage, and implement the file upload UI in the `DetailPanel.tsx`.

### 3. Webhook Finalization
- **Current State:** Endpoints for Acorn and HubSpot webhooks exist (`src/app/api/webhooks/...`).
- **To-Do:** Ensure payload validation, security checks (e.g., validating signature headers), and robust error handling are implemented to accurately map external data into the `items` and `item_links` tables.

### 4. Cron Jobs / Digests
- **Current State:** An API route exists at `src/app/api/cron/digest/route.ts`.
- **To-Do:** Configure a service like Vercel Cron to ping this endpoint daily/weekly to send email summaries or notifications to arborists and managers.

### 5. Production Environment Setup
- **To-Do:** 
  - Ensure Row Level Security (RLS) policies on Supabase are strictly enforced and tested.
  - Setup separate staging and production Supabase environments.
  - Securely manage environment variables in your hosting provider (e.g., Vercel).

### 6. Testing
- **To-Do:** Implement unit tests for utility functions and end-to-end (E2E) tests using Cypress or Playwright to ensure critical paths (like dragging/dropping tasks, login, and real-time sync) remain stable.
