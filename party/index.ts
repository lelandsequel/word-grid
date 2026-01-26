import type * as Party from "partykit/server";

// Dice sets
const DICE_4X4 = [
  'AAEEGN', 'ABBJOO', 'ACHOPS', 'AFFKPS',
  'AOOTTW', 'CIMOTU', 'DEILRX', 'DELRVY',
  'DISTTY', 'EEGHNW', 'EEINSU', 'EHRTVW',
  'EIOSST', 'ELRTTY', 'HIMNQU', 'HLNNRZ'
];

const DICE_5X5 = [
  'AAAFRS', 'AAEEEE', 'AAFIRS', 'ADENNN', 'AEEEEM',
  'AEEGMU', 'AEGMNN', 'AFIRSY', 'BJKQXZ', 'CCNSTW',
  'CEIILT', 'CEILPT', 'CEIPST', 'DDLNOR', 'DHHLOR',
  'DHHNOT', 'DHLNOR', 'EIIITT', 'EMOTTT', 'ENSSSU',
  'FIPRSY', 'GORRVW', 'HIPRRY', 'NOOTUW', 'OOOTTU'
];

const DICE_6X6 = [
  'AAAFRS', 'AAEEEE', 'AAFIRS', 'ADENNN', 'AEEEEM',
  'AEEGMU', 'AEGMNN', 'AFIRSY', 'BJKQXZ', 'CCENST',
  'CCNSTW', 'CEIILT', 'CEILPT', 'CEIPST', 'DDHNOT',
  'DDLNOR', 'DHHLOR', 'DHLNOR', 'DHLNOR', 'EIIITT',
  'EMOTTT', 'ENSSSU', 'ENSSSU', 'FIPRSY', 'GORRVW',
  'GORRVW', 'HIPRRY', 'HIPRRY', 'NOOTUW', 'NOOTUW',
  'OOOTTU', 'OOOTTU', 'AEILMN', 'AEINRT', 'ERSTWY',
  'DKNOTU'
];

const DICE_SETS: Record<number, string[]> = { 4: DICE_4X4, 5: DICE_5X5, 6: DICE_6X6 };
const SCORES: Record<number, number> = { 3: 1, 4: 1, 5: 2, 6: 3, 7: 5, 8: 11 };

interface Player {
  name: string;
  words: Set<string>;
  ready: boolean;
}

interface GameState {
  host: string | null;
  players: Map<string, Player>;
  grid: string[];
  gridSize: number;
  state: 'waiting' | 'playing' | 'results';
  timeLeft: number;
}

// Dictionary will be loaded from KV or fetched
let dictionary: Set<string> = new Set();

function generateGrid(size: number = 4): string[] {
  const dice = DICE_SETS[size] || DICE_4X4;
  const needed = size * size;
  
  let allDice = [...dice];
  while (allDice.length < needed) {
    allDice = allDice.concat(dice);
  }
  
  const shuffled = allDice.slice(0, needed).sort(() => Math.random() - 0.5);
  return shuffled.map(die => {
    const letter = die[Math.floor(Math.random() * 6)];
    return letter === 'Q' ? 'Qu' : letter;
  });
}

function calculateScores(players: Map<string, Player>) {
  const allWords: Record<string, string[]> = {};
  
  for (const [playerId, player] of players) {
    for (const word of player.words) {
      if (!allWords[word]) allWords[word] = [];
      allWords[word].push(playerId);
    }
  }
  
  const results = [];
  for (const [playerId, player] of players) {
    let score = 0;
    const uniqueWords: { word: string; points: number }[] = [];
    const sharedWords: string[] = [];
    
    for (const word of player.words) {
      if (allWords[word].length === 1) {
        const points = SCORES[Math.min(word.length, 8)] || 11;
        score += points;
        uniqueWords.push({ word, points });
      } else {
        sharedWords.push(word);
      }
    }
    
    results.push({
      id: playerId,
      name: player.name,
      score,
      uniqueWords,
      sharedWords,
      totalWords: player.words.size
    });
  }
  
  return results.sort((a, b) => b.score - a.score);
}

export default class WordGridParty implements Party.Server {
  game: GameState;
  timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor(readonly room: Party.Room) {
    this.game = {
      host: null,
      players: new Map(),
      grid: [],
      gridSize: 4,
      state: 'waiting',
      timeLeft: 180
    };
  }

  async onStart() {
    // Load dictionary from storage or initialize
    const stored = await this.room.storage.get<string[]>("dictionary");
    if (stored) {
      dictionary = new Set(stored);
    }
  }

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`Connected: ${conn.id}`);
  }

  async onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message);
    
    switch (data.type) {
      case 'join': {
        const name = data.name || `Player ${this.game.players.size + 1}`;
        const isFirst = this.game.players.size === 0;
        
        if (isFirst) {
          this.game.host = sender.id;
          this.game.gridSize = data.gridSize || 4;
        }
        
        this.game.players.set(sender.id, {
          name,
          words: new Set(),
          ready: false
        });
        
        // Send join confirmation
        sender.send(JSON.stringify({
          type: 'joined',
          isHost: isFirst,
          gridSize: this.game.gridSize,
          roomId: this.room.id
        }));
        
        // Broadcast player list
        this.broadcastPlayers();
        break;
      }
      
      case 'set-grid-size': {
        if (sender.id === this.game.host && this.game.state === 'waiting') {
          this.game.gridSize = data.size;
          this.room.broadcast(JSON.stringify({
            type: 'grid-size-changed',
            gridSize: data.size
          }));
        }
        break;
      }
      
      case 'start-game': {
        if (sender.id !== this.game.host) return;
        
        this.game.grid = generateGrid(this.game.gridSize);
        this.game.state = 'playing';
        this.game.timeLeft = 180;
        
        // Clear words
        for (const player of this.game.players.values()) {
          player.words = new Set();
        }
        
        this.room.broadcast(JSON.stringify({
          type: 'game-started',
          grid: this.game.grid,
          gridSize: this.game.gridSize,
          timeLeft: this.game.timeLeft
        }));
        
        // Start timer
        this.startTimer();
        break;
      }
      
      case 'submit-word': {
        if (this.game.state !== 'playing') {
          sender.send(JSON.stringify({ type: 'word-result', success: false }));
          return;
        }
        
        const word = data.word.toUpperCase();
        const player = this.game.players.get(sender.id);
        
        if (!player) {
          sender.send(JSON.stringify({ type: 'word-result', success: false }));
          return;
        }
        
        if (word.length < 3) {
          sender.send(JSON.stringify({ type: 'word-result', success: false, reason: 'too-short' }));
          return;
        }
        
        if (player.words.has(word)) {
          sender.send(JSON.stringify({ type: 'word-result', success: false, reason: 'duplicate' }));
          return;
        }
        
        // Add word (dictionary validation happens client-side for speed)
        player.words.add(word);
        sender.send(JSON.stringify({ 
          type: 'word-result', 
          success: true, 
          wordCount: player.words.size 
        }));
        break;
      }
      
      case 'new-round': {
        if (sender.id !== this.game.host) return;
        
        this.game.state = 'waiting';
        this.room.broadcast(JSON.stringify({ type: 'round-reset' }));
        break;
      }
    }
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      this.game.timeLeft--;
      this.room.broadcast(JSON.stringify({
        type: 'time-update',
        timeLeft: this.game.timeLeft
      }));
      
      if (this.game.timeLeft <= 0) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.game.state = 'results';
        
        const results = calculateScores(this.game.players);
        this.room.broadcast(JSON.stringify({
          type: 'game-ended',
          results
        }));
      }
    }, 1000);
  }

  broadcastPlayers() {
    const players = Array.from(this.game.players.entries()).map(([id, p]) => ({
      id,
      name: p.name,
      isHost: id === this.game.host
    }));
    
    this.room.broadcast(JSON.stringify({
      type: 'players-updated',
      players,
      gridSize: this.game.gridSize
    }));
  }

  async onClose(conn: Party.Connection) {
    console.log(`Disconnected: ${conn.id}`);
    
    this.game.players.delete(conn.id);
    
    if (this.game.players.size === 0) {
      // Room is empty, reset
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.game.state = 'waiting';
      this.game.host = null;
    } else if (conn.id === this.game.host) {
      // Transfer host
      this.game.host = this.game.players.keys().next().value;
    }
    
    this.broadcastPlayers();
  }
}
