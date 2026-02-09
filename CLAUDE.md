# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fruit Merge Game (과일 합치기 게임) — a Suika/Watermelon-style physics puzzle game. Drop fruits into a container; when two identical fruits collide, they merge into the next larger fruit and award points. Game ends when fruits stack above the LIMIT line for 3+ seconds.

## Running the Game

No build tools, package manager, or dependencies to install. Matter.js is loaded via CDN.

- **Desktop**: open `index.html` in a browser (or serve via `python3 -m http.server 8000`)
- **Mobile**: open `mobile.html` in a browser

## Architecture

Two independent versions of the game exist side-by-side:

| Version | Files | Canvas Size |
|---------|-------|-------------|
| Desktop | `index.html` + `script.js` + `style.css` | 450×600 |
| Mobile  | `mobile.html` (self-contained, inline CSS/JS) | 315×420 (0.7× scale) |

**Mobile is a copy of the desktop logic with scaled-down dimensions and all code inlined into a single HTML file.** Changes to game logic must be applied to both `script.js` and the inline script in `mobile.html`.

### Core Components (script.js)

- **Matter.js setup** (lines 1–76): Engine, renderer, runner, and static boundary bodies (floor, walls, top sensor).
- **Fruit system** (lines 11–19): `FRUITS` array defines 7 fruit types (grape→watermelon) with radius, score, color, and emoji. Only the first 3 (grape, strawberry, tangerine) spawn as drop candidates.
- **Input handling** (lines 152–175): Mouse/touch position tracking + drop on mouseup/touchend. 500ms cooldown between drops.
- **Collision/merge logic** (lines 212–239): On `collisionStart`, matching fruit pairs merge into the next tier at their midpoint. Score = `fruit.score * 2`.
- **Custom rendering** (lines 125–279): Three `afterRender` event handlers draw emoji overlays on fruit bodies, the preview fruit at top, and the LIMIT line at y=150.
- **Game over detection** (lines 282–314): `setInterval` every 1000ms checks if any settled fruit (speed < 0.2) is above the limit line. Triggers game over after 3 cumulative seconds.

### Key Constants (hardcoded)

- Canvas: 450×600 (desktop), 315×420 (mobile)
- Drop height: y=50
- Limit line: y=150
- Game over threshold: 3000ms above limit
- Drop cooldown: 500ms
- Physics restitution: 0.2

## UI Language

All UI text is in Korean (한국어). Font: Noto Sans KR loaded via Google Fonts CDN.
