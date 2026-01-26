# Word Grid 🎮

A real-time multiplayer word game (Boggle-style) with an uncensored 370K+ word dictionary. Built with PartyKit for WebSocket multiplayer and deployed as a PWA.

**Live Demo:** [word-grid.lelandsequel.partykit.dev](https://word-grid.lelandsequel.partykit.dev)

![Word Grid Screenshot](docs/screenshot.png)

## Features

- 🎯 **Multiple Grid Sizes** — 4×4 (Classic), 5×5 (Big), 6×6 (Super)
- 👥 **Real-time Multiplayer** — Create rooms, share codes, play with friends
- 🎮 **Solo Mode** — Practice on your own
- 📖 **370K+ Words** — Uncensored English dictionary (yes, "sex" is valid)
- 📱 **PWA Support** — Install on any device like a native app
- ⚡ **Fast** — PartyKit edge deployment for low latency
- 🏆 **Classic Scoring** — Only unique words count in multiplayer

## How to Play

1. **Create or Join** — Create a room and share the 4-letter code, or join with a code
2. **Find Words** — Swipe/drag through adjacent letters to form words
3. **Score Points** — Longer words = more points
4. **Win** — In multiplayer, only words nobody else found count!

### Scoring

| Word Length | Points |
|-------------|--------|
| 3-4 letters | 1 |
| 5 letters | 2 |
| 6 letters | 3 |
| 7 letters | 5 |
| 8+ letters | 11 |

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no framework needed)
- **Backend:** [PartyKit](https://partykit.io) (WebSocket multiplayer)
- **Dictionary:** 370K words from [dwyl/english-words](https://github.com/dwyl/english-words)
- **Deployment:** PartyKit (backend + static hosting)

## Project Structure

```
boggle-party/
├── party/
│   └── index.ts        # PartyKit server (multiplayer logic)
├── public/
│   ├── index.html      # Main game UI
│   ├── words.txt       # Dictionary (370K words)
│   ├── manifest.json   # PWA manifest
│   ├── sw.js          # Service worker
│   ├── icon-192.png   # App icon
│   └── icon-512.png   # App icon (large)
├── partykit.json       # PartyKit config
├── package.json
└── README.md
```

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/word-grid.git
cd word-grid

# Install dependencies
npm install

# Start local dev server
npm run dev
```

This starts:
- PartyKit server on `localhost:1999`
- Static file server for the frontend

Open [http://localhost:1999](http://localhost:1999) to play locally.

## Deployment

### Deploy to PartyKit

```bash
# Login (first time only)
npx partykit login

# Deploy
npx partykit deploy
```

Your game will be live at `https://word-grid.YOUR_USERNAME.partykit.dev`

### Custom Domain

Custom domains on PartyKit are coming soon. In the meantime, you can:
1. Deploy frontend to Vercel/Netlify with your domain
2. Update `PARTYKIT_HOST` in `public/index.html` to point to your PartyKit backend

## Configuration

### Changing Game Settings

Edit `party/index.ts`:

```typescript
// Game duration (seconds)
room.timeLeft = 180;  // 3 minutes

// Minimum word length
const MIN_WORD_LENGTH = 3;
```

### Adding Words to Dictionary

Add words to `public/words.txt` (one word per line, uppercase):

```
NEWWORD
ANOTHERWORD
```

Then redeploy.

## PWA Installation

### iOS
1. Open in Safari
2. Tap Share → "Add to Home Screen"
3. Enable "Open as Web App"

### Android
1. Open in Chrome
2. Tap menu → "Install app" or "Add to Home Screen"

## Going Native (App Store)

To publish to iOS App Store / Google Play:

```bash
# Add Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init "Word Grid" com.yourdomain.wordgrid

# Add platforms
npx cap add ios
npx cap add android

# Build and open in Xcode/Android Studio
npx cap sync
npx cap open ios
npx cap open android
```

Requirements:
- **iOS:** Apple Developer account ($99/year), Mac with Xcode
- **Android:** Google Play Developer account ($25 one-time)

## API Reference

### PartyKit Messages

#### Client → Server

```typescript
// Join room
{ type: 'join', name: string, gridSize?: number }

// Set grid size (host only)
{ type: 'set-grid-size', size: 4 | 5 | 6 }

// Start game (host only)
{ type: 'start-game' }

// Submit word
{ type: 'submit-word', word: string }

// New round (host only)
{ type: 'new-round' }
```

#### Server → Client

```typescript
// Joined confirmation
{ type: 'joined', isHost: boolean, gridSize: number, roomId: string }

// Players list updated
{ type: 'players-updated', players: Player[], gridSize: number }

// Game started
{ type: 'game-started', grid: string[], gridSize: number, timeLeft: number }

// Timer tick
{ type: 'time-update', timeLeft: number }

// Word result
{ type: 'word-result', success: boolean, reason?: string, wordCount?: number }

// Game ended
{ type: 'game-ended', results: PlayerResult[] }

// Round reset
{ type: 'round-reset' }
```

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/awesome`)
3. Commit changes (`git commit -am 'Add awesome feature'`)
4. Push (`git push origin feature/awesome`)
5. Open a Pull Request

## License

MIT © TJ

## Credits

- Dictionary: [dwyl/english-words](https://github.com/dwyl/english-words)
- Multiplayer: [PartyKit](https://partykit.io)
- Inspiration: Boggle by Hasbro, Boggle Party by Netflix
