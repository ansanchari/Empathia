# Empathia

A premium, real-time dedicated space for shared emotional awareness and support, designed to help partners (may it be of any kind, e.g., spouses, parent-child, friends, siblings, partners, couples) stay in sync. Built with a focus on mindful design, tactile interactions, and absolute data privacy.

**Live Demo:** https://empathia-app.vercel.app

## Features

* **Real-Time Partner Linking:** Secure, one-time invite code system that connects two users instantly using WebSockets.
* **Intuitive Emotion Reflection:** A highly tactile interface for capturing your daily state of mind, featuring dynamic breathing UI cards, contextual tagging, and browser-native voice recognition for hands-free journaling.
* **Live Private Chat:** A dedicated messaging environment featuring glassmorphism design, Apple-style message physics, and live read-receipts.
* **Biological Context Engine:** Optional cycle tracking integration to provide partners with deeper, data-driven empathy and awareness.
* **Premium UI/UX:** Fully responsive design built with Tailwind CSS and Framer Motion, supporting system-level Light and Dark modes.
* **Bank-Grade Security:** Data is strictly isolated using PostgreSQL Row Level Security (RLS) policies, ensuring users can only access their own data and the data of their actively linked partner.

## Tech Stack

* **Frontend:** Next.js (React), Tailwind CSS
* **Animations:** Framer Motion
* **Icons:** Lucide React
* **Backend & Database:** Supabase (PostgreSQL)
* **Authentication:** Supabase Auth
* **Real-Time Subscriptions:** Supabase WebSockets
* **Deployment:** Vercel

## Local Development Setup

To run Empathia locally, you will need Node.js installed and a Supabase project set up.

**1. Clone the repository**
```bash
git clone [https://github.com/ansanchari/empathia.git](https://github.com/ansanchari/empathia.git)
cd empathia

```

**2. Install dependencies**

```bash
npm install

```

**3. Configure Environment Variables**
Create a `.env.local` file in the root directory and add your Supabase credentials:

```text
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

```

**4. Start the development server**

```bash
npm run dev

```

The application will be available at `http://localhost:3000`.

## Database Schema & Security

Empathia relies on a relational PostgreSQL database with the following core tables:

* `profiles`: User information and settings.
* `relationships`: State management for partner connections and invite codes.
* `mood_logs`: Historical emotional data and context notes.
* `messages`: Real-time chat history.

**Row Level Security (RLS)** is strictly enforced across all tables. A comprehensive SQL script is required to set up the necessary tables, policies, and real-time triggers before deployment.