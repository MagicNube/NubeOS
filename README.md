<div align="center">

# NubeOS

**A private desktop workspace for everyday life.**

Habits, meals, documents and media collections in one local-first application.

[Explore the project](https://jesuscaravaca.web.app/) · [Current state](docs/current-state.md) · [Architecture](docs/architecture.md)

![React](https://img.shields.io/badge/React-149eca?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-Tauri-292929?style=flat-square&logo=rust)
![SQLite](https://img.shields.io/badge/SQLite-003b57?style=flat-square&logo=sqlite)

<img src="docs/assets/demo.gif" alt="NubeOS desktop workspace and its connected personal organisation modules" width="100%">

</div>

## Why I built it

I used separate apps for nutrition and Notion for books, series and habits. As those collections grew, relationships between seasons, episodes and repeated viewings became awkward to maintain. Documents were scattered in folders, and I had no connected shopping planner.

I wanted one application I could keep open and adapt to the way I actually organise my day. NubeOS grew from those personal needs, with local data and a focus on interface design.

## What is implemented

| Area | What it does |
| --- | --- |
| Dashboard | Brings together today's habits, meals, documents and entertainment. |
| Meals and shopping | Connects products, nutrition, weekly plans and derived shopping lists. |
| Habits | Tracks recurring habits and tasks, history and statistics. |
| Documents | Manages local PDFs with metadata, tags, expiry dates and an integrated viewer. |
| Reading | Organises books, reading periods, rereads, ratings and history. |
| Media and games | Tracks anime, series, films and video games, with separate progress and repeat histories. |

**Not implemented yet:** finance and project-management modules, full-data export/restore and cloud sync. These are future work, not features of the current app.

## The interface

<img src="docs/assets/screenshots/dashboard.jpeg" alt="NubeOS dashboard with the daily overview" width="100%">

<details>
<summary>Meals, planning, habits and documents</summary>

### Meal planning

<img src="docs/assets/screenshots/planner.jpeg" alt="Weekly meal planner and shopping workflow" width="100%">
<img src="docs/assets/screenshots/meals.jpeg" alt="Food and nutrition management" width="100%">

### Habits

<img src="docs/assets/screenshots/habits.jpeg" alt="Recurring habits and completion tracking" width="100%">

### Documents

<img src="docs/assets/screenshots/docs.jpeg" alt="Local document library" width="100%">
<img src="docs/assets/screenshots/document-preview.jpeg" alt="PDF preview inside NubeOS" width="100%">

</details>

<details>
<summary>Reading and entertainment</summary>

<img src="docs/assets/screenshots/reading.jpeg" alt="Reading library and book tracking" width="100%">
<img src="docs/assets/screenshots/anime.jpeg" alt="Anime library with progress and ratings" width="100%">

</details>

## Architecture

```text
React / TypeScript
       ↓ Tauri commands
Rust application and domain logic
       ↓
SQLite + managed local files
```

React owns presentation and temporary UI state. Small Tauri commands delegate to Rust, where domain validation and persistence live. SQLite evolves through versioned migrations; PDFs and covers are managed as local files. Daily use does not require a cloud account or a backend server.

<details>
<summary>Architecture diagram</summary>

<img src="docs/assets/architecture.png" alt="React, Tauri commands, Rust domain logic and local persistence" width="100%">

</details>

## Run locally

Install Node.js 24, pnpm, stable Rust and the [native prerequisites for Tauri](https://v2.tauri.app/start/prerequisites/). On Windows these include Microsoft C++ Build Tools and WebView2.

```sh
git clone https://github.com/MagicNube/NubeOS.git
cd NubeOS
pnpm install --frozen-lockfile
pnpm tauri dev
```

`pnpm dev` starts the web interface alone; it does not replace the native Tauri backend used by the application.

## Checks and builds

```sh
pnpm test
cargo test --manifest-path src-tauri/Cargo.toml
pnpm build
pnpm tauri build
```

Development tools and dependencies are needed to build from source. The app stores its data separately from the executable; the repository contains no personal database. Automated full-data backup and restore are not implemented yet.

## Project documentation

- [Vision](docs/vision.md) and [design principles](docs/principles.md)
- [Current implementation and known limits](docs/current-state.md)
- [Architecture](docs/architecture.md) and [decision records](docs/decisions/README.md)
- [Module specifications](docs/modules/README.md) and [roadmap](docs/roadmap.md)

This is a personal project that evolves with my own use. Features and distribution status are documented separately so the source tree is not confused with a particular installed build.

## License

MIT, as declared by the original project README. The standalone `LICENSE` file is not yet included in the repository.
