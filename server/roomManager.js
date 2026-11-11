// Real-time multiplayer and party room coordinator with WebSocket communication

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> roomState
    this.clients = new Map(); // ws -> { roomCode, playerId }
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createRoom({ hostName, avatar, gameMode = 'teams', eraFilter = 'all', timerSeconds = 30 }) {
    let roomCode = this.generateRoomCode();
    while (this.rooms.has(roomCode)) {
      roomCode = this.generateRoomCode();
    }

    const hostId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const room = {
      code: roomCode,
      hostId: hostId,
      gameMode: gameMode, // 'teams' or 'individual'
      eraFilter: eraFilter,
      status: 'lobby', // 'lobby', 'question', 'buzzed', 'revealed', 'ended'
      roundNumber: 0,
      totalRounds: 10,
      timerSeconds: timerSeconds,
      currentCard: null,
      revealedClueLevel: 1, // 1: English 1, 2: English 2, 3: Visual/Actor, 4: Music/Singer, 5: Hinglish
      buzzer: {
        active: false,
        playerId: null,
        playerName: null,
        playerAvatar: null,
        playerTeam: null,
        buzzedAt: null,
        expiresAt: null
      },
      teams: {
        team_red: {
          id: 'team_red',
          name: 'Team Sholay',
          color: '#e11d48',
          score: 0,
          members: []
        },
        team_blue: {
          id: 'team_blue',
          name: 'Team DDLJ',
          color: '#2563eb',
          score: 0,
          members: []
        }
      },
      players: new Map(), // playerId -> playerObj
      sockets: new Set() // Set of WebSocket connections
    };

    // Add host as first player
    const hostPlayer = {
      id: hostId,
      name: hostName || 'Bollywood Baadshah',
      avatar: avatar || '🦁',
      isHost: true,
      team: gameMode === 'teams' ? 'team_red' : null,
      score: 0,
      joinedAt: Date.now()
    };
    room.players.set(hostId, hostPlayer);
    if (gameMode === 'teams') {
      room.teams.team_red.members.push(hostId);
    }

    this.rooms.set(roomCode, room);
    console.log(`[RoomManager] Room created: ${roomCode} by ${hostPlayer.name}`);
    return { roomCode, hostId, room: this.serializeRoom(room) };
  }

  joinRoom({ roomCode, playerName, avatar, team, ws }) {
    const code = (roomCode || '').toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) {
      return { error: 'Room not found. Please check the code.' };
    }

    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    
    // Auto-balance team if not specified
    let playerTeam = team;
    if (room.gameMode === 'teams') {
      if (!playerTeam) {
        playerTeam = room.teams.team_red.members.length <= room.teams.team_blue.members.length
          ? 'team_red'
          : 'team_blue';
      }
      room.teams[playerTeam]?.members.push(playerId);
    }

    const player = {
      id: playerId,
      name: playerName || `Player ${room.players.size + 1}`,
      avatar: avatar || '🌟',
      isHost: false,
      team: playerTeam,
      score: 0,
      joinedAt: Date.now()
    };

    room.players.set(playerId, player);
    if (ws) {
      room.sockets.add(ws);
      this.clients.set(ws, { roomCode: code, playerId });
    }

    this.broadcastToRoom(code, {
      type: 'PLAYER_JOINED',
      player,
      room: this.serializeRoom(room)
    });

    return { playerId, room: this.serializeRoom(room) };
  }

  attachSocket(ws, roomCode, playerId) {
    const code = (roomCode || '').toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) return;

    room.sockets.add(ws);
    this.clients.set(ws, { roomCode: code, playerId });

    // Send full state to newly connected client
    ws.send(JSON.stringify({
      type: 'SYNC_STATE',
      room: this.serializeRoom(room)
    }));
  }

  handleDisconnect(ws) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    const { roomCode, playerId } = clientInfo;
    this.clients.delete(ws);

    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.sockets.delete(ws);

    // If host left, assign next player as host
    const player = room.players.get(playerId);
    if (player && player.isHost && room.players.size > 1) {
      room.players.delete(playerId);
      const nextPlayer = room.players.values().next().value;
      if (nextPlayer) nextPlayer.isHost = true;
    } else {
      room.players.delete(playerId);
    }

    // Clean up empty room after 10 mins
    if (room.players.size === 0) {
      setTimeout(() => {
        if (room.players.size === 0) {
          this.rooms.delete(roomCode);
          console.log(`[RoomManager] Cleaned up inactive room ${roomCode}`);
        }
      }, 10 * 60 * 1000);
    }

    this.broadcastToRoom(roomCode, {
      type: 'PLAYER_LEFT',
      playerId,
      room: this.serializeRoom(room)
    });
  }

  startRound(roomCode, card) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.status = 'question';
    room.roundNumber += 1;
    room.currentCard = card;
    room.revealedClueLevel = 1;
    room.buzzer = {
      active: true,
      playerId: null,
      playerName: null,
      playerAvatar: null,
      playerTeam: null,
      buzzedAt: null,
      expiresAt: null
    };

    this.broadcastToRoom(roomCode, {
      type: 'ROUND_STARTED',
      room: this.serializeRoom(room)
    });
  }

  advanceClue(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.currentCard) return;

    if (room.revealedClueLevel < 5) {
      room.revealedClueLevel += 1;
      this.broadcastToRoom(roomCode, {
        type: 'CLUE_ADVANCED',
        revealedClueLevel: room.revealedClueLevel,
        room: this.serializeRoom(room)
      });
    }
  }

  handleBuzzer(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room || room.status !== 'question') return;
    if (!room.buzzer.active || room.buzzer.playerId) return; // already buzzed

    const player = room.players.get(playerId);
    if (!player) return;

    room.status = 'buzzed';
    room.buzzer = {
      active: false,
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      playerTeam: player.team,
      buzzedAt: Date.now(),
      expiresAt: Date.now() + 10000 // 10s to answer
    };

    this.broadcastToRoom(roomCode, {
      type: 'BUZZER_HIT',
      buzzer: room.buzzer,
      room: this.serializeRoom(room)
    });
  }

  handleScoreDecision(roomCode, { isCorrect, pointsEarned }) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const buzzerPlayer = room.players.get(room.buzzer.playerId);
    const points = pointsEarned || Math.max(20, 120 - (room.revealedClueLevel * 20));

    if (isCorrect) {
      if (buzzerPlayer) {
        buzzerPlayer.score += points;
        if (buzzerPlayer.team && room.teams[buzzerPlayer.team]) {
          room.teams[buzzerPlayer.team].score += points;
        }
      }
      room.status = 'revealed';
      room.revealedClueLevel = 5; // reveal everything
    } else {
      // Re-open buzzer for others
      room.status = 'question';
      room.buzzer = {
        active: true,
        playerId: null,
        playerName: null,
        playerAvatar: null,
        playerTeam: null,
        buzzedAt: null,
        expiresAt: null
      };
    }

    this.broadcastToRoom(roomCode, {
      type: isCorrect ? 'ROUND_CORRECT' : 'ROUND_WRONG',
      winnerPlayer: buzzerPlayer,
      points,
      room: this.serializeRoom(room)
    });
  }

  revealAnswer(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.status = 'revealed';
    room.revealedClueLevel = 5;

    this.broadcastToRoom(roomCode, {
      type: 'ANSWER_REVEALED',
      room: this.serializeRoom(room)
    });
  }

  sendReaction(roomCode, { playerId, emoji }) {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    const player = room.players.get(playerId);
    this.broadcastToRoom(roomCode, {
      type: 'REACTION',
      playerId,
      playerName: player ? player.name : 'Fan',
      emoji
    });
  }

  switchTeam(roomCode, { playerId, targetTeam }) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.teams[targetTeam]) return;

    const player = room.players.get(playerId);
    if (!player) return;

    // Remove from old team
    if (player.team && room.teams[player.team]) {
      room.teams[player.team].members = room.teams[player.team].members.filter(id => id !== playerId);
    }

    player.team = targetTeam;
    room.teams[targetTeam].members.push(playerId);

    this.broadcastToRoom(roomCode, {
      type: 'TEAM_UPDATED',
      room: this.serializeRoom(room)
    });
  }

  broadcastToRoom(roomCode, message) {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    const data = JSON.stringify(message);
    for (const ws of room.sockets) {
      if (ws.readyState === 1 /* OPEN */) {
        ws.send(data);
      }
    }
  }

  serializeRoom(room) {
    return {
      code: room.code,
      hostId: room.hostId,
      gameMode: room.gameMode,
      eraFilter: room.eraFilter,
      status: room.status,
      roundNumber: room.roundNumber,
      totalRounds: room.totalRounds,
      timerSeconds: room.timerSeconds,
      currentCard: room.status === 'revealed' ? room.currentCard : this.sanitizeCardForPlayers(room.currentCard, room.revealedClueLevel),
      revealedClueLevel: room.revealedClueLevel,
      buzzer: room.buzzer,
      teams: room.teams,
      players: Array.from(room.players.values())
    };
  }

  sanitizeCardForPlayers(card, clueLevel) {
    if (!card) return null;
    return {
      id: card.id,
      era: card.era,
      release_year: clueLevel >= 4 ? card.release_year : null,
      english_riddle_1: card.english_riddle_1,
      english_riddle_2: clueLevel >= 2 ? card.english_riddle_2 : null,
      actor_visual_clue: clueLevel >= 3 ? card.actor_visual_clue : null,
      music_director_clue: clueLevel >= 4 ? card.music_director_clue : null,
      hinglish_lyrics_1: clueLevel >= 5 ? card.hinglish_lyrics_1 : null,
      hinglish_lyrics_2: clueLevel >= 5 ? card.hinglish_lyrics_2 : null,
      distractors: card.distractors, // For multiple choice mode
      // Song title, movie, artist, and youtube link remain hidden until revealed!
      song_name: null,
      movie_name: null,
      artist: null,
      youtube_video_id: null,
      youtube_search_query: null
    };
  }
}

module.exports = new RoomManager();
