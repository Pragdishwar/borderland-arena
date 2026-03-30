# ⚔️ Borderland Arena

**Survival Tech Challenge** — A high-intensity, multi-stage competitive programming and technical puzzle platform built for developers who thrive under pressure.

---

## 🚀 Overview

Borderland Arena is a gamified technical competition platform where teams compete across four specialized rounds. The platform features real-time synchronization, an integrated code execution engine, and an automated "Atmospheric Breach" anti-cheat system.

### 🎮 Game Structure

| Round | Name | Duration | Description |
|-------|------|----------|-------------|
| **Round 1** | Entry Game | 10 Min | Fast-paced MCQ & technical trivia. |
| **Round 2** | Execution Trace | 20 Min | Mental code tracing to predict decrypted outputs. |
| **Round 3** | Reverse Compiler | 30 Min | Algorithmic challenges with a reverse-typing mechanic. |
| **Round 4** | Code Autopsy | 30 Min | Refactoring and patching broken/inefficient code. |

---

## ✨ Core Features

-   **Live Arena Status**: Real-time landing page dashboard showing active lobby codes, registered team counts, and synchronized round timers.
-   **Orbital Decay (Timer)**: Global synchronized countdown system that accounts for admin pauses and total elapsed time.
-   **Atmospheric Breach (Anti-Cheat)**: Advanced tracking of tab switches and window focus loss to maintain competitive integrity.
-   **Multi-Language Execution**: Backend integration via Piston API for real-time code evaluation (JS, Python, Java, C++).
-   **Admin Command Center**: Complete control over game state, including round management, team striking/unbanning, and question management.

---

## 🛠️ Tech Stack

-   **Frontend**: React 18, Vite, TypeScript
-   **Styling**: Tailwind CSS, Framer Motion (Animations), Lucide React (Icons)
-   **UI Components**: shadcn/ui (Radix UI primitives)
-   **Backend/Database**: Supabase (PostgreSQL, Auth, Real-time)
-   **State Management**: TanStack Query (React Query)
-   **Code Editor**: Monaco Editor & CodeMirror

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- npm or bun

### Installation

1.  **Clone the repository**:
    ```sh
    git clone https://github.com/your-repo/borderland-arena.git
    cd borderlandarena
    ```

2.  **Install dependencies**:
    ```sh
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the root and add your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Launch Development Server**:
    ```sh
    npm run dev
    ```

---

## 👥 Developers

- **Pragdishwar**
- **Abinav Kishore**
- **Elango D**
- **Nisha Perumal**

---

## ⚖️ License
Proprietary — Developed for specialized technical arena events.
