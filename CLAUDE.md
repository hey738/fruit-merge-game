# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fruit Merge Game (과일 합치기 게임) — a Suika/Watermelon-style physics puzzle game. Drop fruits into a container; when two identical fruits collide, they merge into the next larger fruit and award points. Game ends when fruits stack above the LIMIT line for 3+ seconds.

## Running the Game

No build tools, package manager, or dependencies to install. Matter.js is loaded via CDN.

Open `index.html` in a browser, or serve locally:
```
python3 -m http.server 8000
```

## Architecture

Single-page game with three files: `index.html`, `script.js`, `style.css`.

### Responsive Scaling

`script.js` computes a `SCALE` factor at startup based on available viewport space (base dimensions: 450×600). All game constants (fruit radii, positions, font sizes) are multiplied by `SCALE`, so the game adapts to any screen size without a separate mobile version.

### Core Components (script.js)

- **Matter.js setup**: Engine, renderer, runner, and static boundary bodies (floor, walls, top sensor).
- **Fruit system**: `FRUITS` array defines 7 fruit types (grape→watermelon) with radius, score, color, and emoji. Only the first 3 (grape, strawberry, tangerine) spawn as drop candidates.
- **Input handling**: Mouse, touch, and keyboard (Arrow keys / WASD + Space) position tracking and drop. 500ms cooldown between drops.
- **Collision/merge logic**: On `collisionStart`, matching fruit pairs merge into the next tier at their midpoint. Score = `fruit.score * 2`. A `removedBodies` Set prevents double-processing.
- **Custom rendering**: Single `afterRender` handler draws emoji overlays on fruit bodies, the preview fruit + drop guideline, the LIMIT line, merge particles, and score popups.
- **Game over detection**: `setInterval` every 1000ms checks if any settled fruit (speed < 0.2) is above the limit line. Triggers game over after 3 cumulative seconds.
- **Sound effects**: Web Audio API oscillator-based sounds (drop, merge, game over). No audio files.

### Key Constants

- Base canvas: 450×600 (scaled by `SCALE`)
- Drop height: y=50 × SCALE
- Limit line: y=150 × SCALE
- Game over threshold: 3000ms above limit
- Drop cooldown: 500ms
- Physics restitution: 0.2
- Best score persisted in `localStorage` key `fruitMergeBest`

## UI Language

All UI text is in Korean (한국어). Font: Noto Sans KR loaded via Google Fonts CDN.
