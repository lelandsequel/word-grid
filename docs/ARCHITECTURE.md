# Architecture

## Overview

Word Grid uses a client-server architecture with real-time WebSocket communication for multiplayer gameplay.

```
┌─────────────────┐         ┌─────────────────────────────┐
│                 │         │      PartyKit Server        │
│   Browser/PWA   │◄───────►│                             │
│                 │   WS    │  ┌─────────────────────┐    │
│  - Game UI      │         │  │    Room Instance    │    │
│  - Dictionary   │         │  │                     │    │
│  - Word Valid.  │         │  │  - Player state     │    │
│                 │         │  │  - Grid             │    │
└─────────────────┘         │  │  - Timer            │    │
                            │  │  - Score calc       │    │
                            │  └─────────────────────┘    │
                            └─────────────────────────────┘
```

## Components

### Frontend (`public/index.html`)

Single-page application with:

- **Screens:** Menu → Lobby → Game → Results
- **Grid Rendering:** Dynamic CSS grid based on size (4/5/6)
- **Input Handling:** Touch and mouse drag support
- **Dictionary:** Loaded client-side for instant word validation
- **PWA:** Service worker for offline support, manifest for installation

### Backend (`party/index.ts`)

PartyKit "party" (room-based WebSocket server):

- **Room Management:** Each room code maps to a PartyKit room instance
- **State:** Players, grid, timer, game phase
- **Scoring:** Calculates unique vs shared words at round end
- **Real-time Sync:** Broadcasts state changes to all connected clients

## Game Flow

```
1. CREATE ROOM
   Client                          Server
     │                               │
     │──── join {name, gridSize} ───►│
     │                               │ Create room state
     │◄─── joined {isHost: true} ────│
     │                               │

2. JOIN ROOM
   Client                          Server
     │                               │
     │──── join {name} ─────────────►│
     │                               │ Add player to room
     │◄─── joined {isHost: false} ───│
     │◄─── players-updated ──────────│ (broadcast)
     │                               │

3. START GAME
   Host                            Server                         Players
     │                               │                               │
     │──── start-game ──────────────►│                               │
     │                               │ Generate grid                 │
     │                               │ Start timer                   │
     │◄─── game-started {grid} ──────┼───────────────────────────────►
     │                               │                               │
     │                               │ (every second)                │
     │◄─── time-update ──────────────┼───────────────────────────────►
     │                               │                               │

4. SUBMIT WORDS
   Client                          Server
     │                               │
     │──── submit-word {word} ──────►│
     │                               │ Validate, store
     │◄─── word-result {success} ────│
     │                               │

5. ROUND END
   Server                          All Clients
     │                               │
     │ Calculate scores              │
     │ (unique words only)           │
     │                               │
     │──── game-ended {results} ─────►
     │                               │
```

## Dictionary

- **Source:** [dwyl/english-words](https://github.com/dwyl/english-words)
- **Size:** ~370,000 words
- **Format:** Plain text, one word per line
- **Loading:** Client-side fetch, cached by service worker
- **Validation:** Case-insensitive, minimum 3 letters

## Scoring Algorithm

```javascript
function calculateScores(players) {
  // 1. Collect all words from all players
  const allWords = {};
  for (player of players) {
    for (word of player.words) {
      allWords[word].push(player.id);
    }
  }

  // 2. Score only unique words (found by one player)
  for (player of players) {
    for (word of player.words) {
      if (allWords[word].length === 1) {
        player.score += POINTS[word.length];
      }
    }
  }
}
```

## PWA Features

- **Manifest:** App name, icons, theme colors, standalone display
- **Service Worker:** Caches static assets, enables offline solo play
- **Installation:** "Add to Home Screen" on iOS/Android

## Security Considerations

- Word validation happens client-side (for speed) AND server-side (for integrity)
- No authentication required (anonymous play)
- Room codes are random 4-character alphanumeric
- No persistent data storage (rooms exist only while players connected)
