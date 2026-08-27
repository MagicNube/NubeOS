<div align="center">

# NubeOS

### My Personal Productivity Operating System

**One application. Everything I need. Nothing I don't.**

A local-first desktop application that replaces the dozens of tools I used every day with a single, unified workspace tailored to my own workflow.

Built with **React, Tauri and Rust**.

<br>

![GitHub stars](https://img.shields.io/github/stars/MagicNube/NubeOS?style=flat-square)
![GitHub last commit](https://img.shields.io/github/last-commit/MagicNube/NubeOS?style=flat-square)

<br>

![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=flat-square&logo=rust)
![Tauri](https://img.shields.io/badge/Tauri-FFC131?style=flat-square&logo=tauri&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite)

<br><br>

<img src="./docs/assets/demo.gif" alt="NubeOS Demo">

</div>

---

# Why I built NubeOS

Over the years I ended up relying on dozens of different applications.

One app for habits.

Another for meal planning.

Another for finances.

Another for reading.

Another for documents.

Another for anime.

None of them worked together, many required subscriptions, and all forced me to adapt to someone else's workflow.

So I decided to build the software I actually wanted.

**NubeOS is my own operating system for everyday life.**

Every module exists because I genuinely use it.

Nothing is included unless it solves a real problem for me.

---

# ✨ Features

- 🏠 Unified personal dashboard
- 🍽 Meal planner with automatic shopping list generation
- 💰 Personal finance tracking
- 📄 Private document manager with PDF preview
- ✅ Habit tracker
- 📚 Reading library and statistics
- 🎮 Video game tracker
- 🎬 Movie tracker
- 📺 TV series tracker
- 🍿 Anime tracker
- 📦 Local-first architecture
- 🔒 No cloud dependency
- ⚡ Native desktop performance

---

# 📸 Screenshots

## Dashboard

Everything important at a glance.

<p align="center">
<img src="./docs/screenshots/dashboard.png" width="100%">
</p>

---

## Meal Planning

Weekly planning, recipes, nutrition and automatic shopping lists.

<p align="center">
<img src="./docs/screenshots/planner.png" width="100%">
</p>

---

## Habit Tracking

Track recurring habits and monitor long-term consistency.

<p align="center">
<img src="./docs/screenshots/habits.png" width="100%">
</p>

---

## Personal Documents

Store important documents locally with metadata, expiration dates and built-in PDF preview.

<p align="center">
<img src="./docs/screenshots/docs.png" width="100%">
</p>

---

## Reading Library

Track books, reading progress and personal ratings.

<p align="center">
<img src="./docs/screenshots/reading.png" width="100%">
</p>

---

## Entertainment Library

Manage anime, movies, TV series and games from one place.

<p align="center">
<img src="./docs/screenshots/anime.png" width="100%">
</p>

---

# 🏗 Architecture

NubeOS follows a **local-first desktop architecture**.

The user interface is built with React, while all business logic is implemented in Rust through Tauri commands.

Application data is stored locally using SQLite together with private files such as PDFs, images and media.

No backend server is required.

<p align="center">
<img src="./docs/assets/architecture.png" width="100%">
</p>

### Why this architecture?

- 🔒 Complete data ownership
- ⚡ Native desktop performance
- 📦 Works entirely offline
- 🧠 Strong separation between UI and business logic
- 🚀 Easily extensible with new modules

---

# 🛠 Tech Stack

| Category | Technologies |
|-----------|--------------|
| Frontend | React · TypeScript · Vite |
| Desktop | Tauri |
| Backend | Rust |
| Database | SQLite |
| Styling | Tailwind CSS |
| State Management | Zustand |

---

# 🚀 Running locally

```bash
git clone https://github.com/MagicNube/NubeOS.git

cd NubeOS

pnpm install

pnpm tauri dev
```

---

# 📖 Documentation

The project documentation includes:

- Vision
- Architecture
- Design principles
- Module specifications
- Technical decisions (ADRs)
- Roadmap
- Learning notes

See the `docs/` directory for more information.

---

# 🚧 Project Status

NubeOS is my long-term personal project and is under active development.

New modules and refinements are added continuously as my own workflow evolves.

---

# 📄 License

MIT
