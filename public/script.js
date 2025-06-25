// Variabili globali
let onlineMode = false;
let socket = null;
let localGamePaused = false;
let chosenTimerDuration = 45; // verrà impostato dallo user nella schermata di setup
let onlineWordLength = 0; // lunghezza della parola (per controllo automatico in online)
let currentUser = null;

// Verifica autenticazione
function checkAuth() {
  const userStr = localStorage.getItem('eredita_user');
  if (!userStr) {
    // Utente non autenticato, reindirizza alla pagina di login
    window.location.href = '/login.html';
    return false;
  }
  
  try {
    currentUser = JSON.parse(userStr);
    return true;
  } catch (e) {
    // Dati utente non validi
    localStorage.removeItem('eredita_user');
    window.location.href = '/login.html';
    return false;
  }
}

// Funzione per il logout
function logout() {
  localStorage.removeItem('eredita_user');
  window.location.href = '/login.html';
}

// Lista di parole e definizioni per la modalità locale
const words = [
  { word: "svelare", definition: "abaku（暴く)" }, 
  { word: "costola", definition: "abare（あばら)" },
  { word: "scatenarsi", definition: "abareru（暴れる)" },
  { word: "sottosopra", definition: "abekobe（あべこべ)" },
  { word: "invertire", definition: "abekobe ni suru（あべこべにする)" },
  { word: "docciarsi", definition: "shawaa o abiru（シャワーを浴びる)" },
  { word: "abbronzarsi", definition: "hi o abiru（日を浴びる)" },
  { word: "tafano", definition: "abu（虻)" },
  { word: "pericoloso", definition: "abunai（危ない)" },
  { word: "olio", definition: "abura（油)" },
  { word: "pesante", definition: "aburakkoi（脂っこい)" },
  { word: "arrostire", definition: "aburu（あぶる)" },
  { word: "abruzzo", definition: "aburuttshoshuu（アブルッツィ州)" },
  { word: "li", definition: "acchi（あっち)" },
  { word: "arco", definition: "aachi（アーチ)" },
  { word: "soprannome", definition: "adana（あだ名)" },
];

// Verifica autenticazione all'avvio
window.addEventListener('DOMContentLoaded', function() {
  if (!checkAuth()) return;
});

// Elementi DOM
const menuDiv = document.getElementById('menu');
const localGameSetupDiv = document.getElementById('localGameSetup');
const onlineGameSetupDiv = document.getElementById('onlineGameSetup');
const gameAreaDiv = document.getElementById('gameArea');
const playersTimersDiv = document.getElementById('playersTimers');
const turnInfoDiv = document.getElementById('turnInfo');
const definitionDiv = document.getElementById('definition');
const wordDisplayDiv = document.getElementById('wordDisplay');
const timerDiv = document.getElementById('timer');
const resultDiv = document.getElementById('result');
const guessInput = document.getElementById('guessInput');

const localGameBtn = document.getElementById('localGameBtn');
const onlineGameBtn = document.getElementById('onlineGameBtn');
const startVoiceBtn = document.getElementById('startVoiceBtn');
const pauseBtn = document.getElementById('pauseBtn');
const onlineStatusDiv = document.getElementById('onlineStatus');
const cancelOnlineBtn = document.getElementById('cancelOnlineBtn');

const numPlayersSelect = document.getElementById('numPlayers');
const timerDurationInput = document.getElementById('timerDuration');
const playerNamesContainer = document.getElementById('playerNamesContainer');
const restartBtn = document.getElementById('restartBtn');
const menuBtn = document.getElementById('menuBtn');
const backToMenuBtn = document.getElementById('backToMenuBtn');
const turnTransitionDiv = document.getElementById('turnTransition');

// Variabili per la modalità locale
let players = []; // Oggetti: { id, name, remainingTime }
let currentPlayerIndex = 0;
let currentWordObj = null;
let currentDisplayed = "";
let letterRevealInterval = null;
let timerInterval = null;

// Variabili per la logica del turno locale
let currentWordLetters = [];
let revealedIndexes = [];

// Gestione degli input per i nomi dei giocatori
numPlayersSelect.addEventListener('change', updatePlayerNamesInputs);
function updatePlayerNamesInputs() {
  let num = parseInt(numPlayersSelect.value);
  playerNamesContainer.innerHTML = '';
  for (let i = 0; i < num; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Nome giocatore ${i + 1}`;
    input.id = `playerName${i + 1}`;
    input.classList.add('player-name');
    playerNamesContainer.appendChild(input);
  }
}
updatePlayerNamesInputs();

// Mostra il nome utente nel menu
function updateUserDisplay() {
  const usernameDisplay = document.getElementById('username-display');
  if (usernameDisplay && currentUser) {
    usernameDisplay.textContent = currentUser.username;
  }
}

// Aggiungiamo il listener per il pulsante di logout
document.getElementById('logoutBtn').addEventListener('click', logout);

// Aggiorniamo il display utente dopo il caricamento della pagina
window.addEventListener('DOMContentLoaded', function() {
  if (checkAuth()) {
    updateUserDisplay();
  }
});

// --- Gestione dei pulsanti del menu ---
localGameBtn.addEventListener('click', () => {
  // Se c'era una partita online in corso, la interrompiamo
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  onlineMode = false;
  guessInput.disabled = false;
  menuDiv.classList.add('hidden');
  localGameSetupDiv.classList.remove('hidden');
});

onlineGameBtn.addEventListener('click', () => {
  menuDiv.classList.add('hidden');
  onlineGameSetupDiv.classList.remove('hidden');
  initOnlineGame();
});

cancelOnlineBtn.addEventListener('click', () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  onlineMode = false;
  onlineGameSetupDiv.classList.add('hidden');
  menuDiv.classList.remove('hidden');
});

backToMenuBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  clearInterval(letterRevealInterval);
  gameAreaDiv.classList.add('hidden');
  menuDiv.classList.remove('hidden');
});

// --- Modalità Locale ---
document.getElementById('startLocalGameBtn').addEventListener('click', startLocalGame);
function startLocalGame() {
  // Se c'era una partita online, resettiamo lo stato
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  onlineMode = false;
  guessInput.disabled = false;
  clearInterval(timerInterval);
  clearInterval(letterRevealInterval);

  const numPlayers = parseInt(numPlayersSelect.value);
  chosenTimerDuration = parseInt(timerDurationInput.value);
  players = [];
  for (let i = 0; i < numPlayers; i++) {
    const input = document.getElementById(`playerName${i + 1}`);
    let name = input.value.trim();
    if (name === '') {
      name = `Giocatore ${i + 1}`;
    }
    players.push({ id: i + 1, name: name, remainingTime: chosenTimerDuration });
  }
  currentPlayerIndex = 0;
  localGameSetupDiv.classList.add('hidden');
  gameAreaDiv.classList.remove('hidden');
  resultDiv.innerText = "";
  pauseBtn.classList.remove('hidden');
  hideEndGameControls();
  showTurnTransition(players[currentPlayerIndex].name, startTurnLocal);
}

function showTurnTransition(name, callback) {
  turnTransitionDiv.innerText = `Turno di ${name}`;
  turnTransitionDiv.classList.remove('hidden');
  turnTransitionDiv.style.animation = 'slideInOut 1.5s forwards';
  setTimeout(() => {
    turnTransitionDiv.classList.add('hidden');
    turnTransitionDiv.style.animation = '';
    if (callback) callback();
  }, 1500);
}

function startTurnLocal() {
  localGamePaused = false;
  pauseBtn.innerText = "Pausa";
  // Riabilita il campo di input per la modalità locale
  guessInput.disabled = false;

  if (players[currentPlayerIndex].remainingTime <= 0) {
    turnInfoDiv.innerText = `${players[currentPlayerIndex].name} ha esaurito il tempo. Fine partita!`;
    resultDiv.innerText = "";
    gameOverLocal();
    return;
  }
  updatePlayersTimers();
  turnInfoDiv.innerText = `Turno di ${players[currentPlayerIndex].name}`;
  resultDiv.innerText = "";
  guessInput.value = "";

  currentWordObj = words[Math.floor(Math.random() * words.length)];
  const parola = currentWordObj.word.toLowerCase();
  currentWordLetters = parola.split('');
  revealedIndexes = [0]; // La prima lettera è sempre visibile
  currentDisplayed = currentWordLetters.map((letter, idx) => idx === 0 ? letter : "_").join(" ");
  definitionDiv.innerText = `Definizione: ${currentWordObj.definition}`;
  wordDisplayDiv.innerText = currentDisplayed;
  adjustWordDisplayFont();

  startTimerLocal();
  startLetterRevealLocal();
}

function startTimerLocal() {
  timerDiv.innerText = `Tempo: ${players[currentPlayerIndex].remainingTime}s`;
  timerInterval = setInterval(() => {
    if (!localGamePaused) {
      players[currentPlayerIndex].remainingTime--;
      timerDiv.innerText = `Tempo: ${players[currentPlayerIndex].remainingTime}s`;
      updatePlayersTimers();
      if (players[currentPlayerIndex].remainingTime <= 0) {
        clearInterval(timerInterval);
        clearInterval(letterRevealInterval);
        resultDiv.innerText = `Tempo scaduto per ${players[currentPlayerIndex].name}!`;
        turnInfoDiv.innerText = `${players[currentPlayerIndex].name} ha esaurito il tempo. Fine partita!`;
        gameOverLocal();
      }
    }
  }, 1000);
}

function startLetterRevealLocal() {
  letterRevealInterval = setInterval(() => {
    if (!localGamePaused) {
      const notRevealed = [];
      for (let i = 1; i < currentWordLetters.length; i++) {
        if (!revealedIndexes.includes(i)) {
          notRevealed.push(i);
        }
      }
      if (notRevealed.length <= 1) {
        clearInterval(letterRevealInterval);
        return;
      }
      const randomIndex = notRevealed[Math.floor(Math.random() * notRevealed.length)];
      revealedIndexes.push(randomIndex);
      currentDisplayed = currentWordLetters.map((letter, idx) => revealedIndexes.includes(idx) ? letter : "_").join(" ");
      wordDisplayDiv.innerText = currentDisplayed;
      adjustWordDisplayFont();
    }
  }, 2000);
}

function adjustWordDisplayFont() {
  const container = wordDisplayDiv;
  let fontSize = 2.5;
  container.style.fontSize = fontSize + "rem";
  while (container.scrollWidth > container.clientWidth && fontSize > 1) {
    fontSize -= 0.1;
    container.style.fontSize = fontSize + "rem";
  }
}

function updatePlayersTimers() {
  let html = "<strong>Timer dei giocatori:</strong><br>";
  players.forEach((p, idx) => {
    html += (idx === currentPlayerIndex) ?
      `<span style="color:#ffd700;">${p.name}: ${p.remainingTime}s</span><br>` :
      `${p.name}: ${p.remainingTime}s<br>`;
  });
  playersTimersDiv.innerHTML = html;
}

// Gestione automatica dell'input in entrambe le modalità
guessInput.addEventListener('input', () => {
  if (onlineMode) {
    if (onlineWordLength && guessInput.value.trim().length === onlineWordLength) {
      checkGuessOnline();
    }
  } else if (currentWordObj) {
    if (guessInput.value.trim().length === currentWordObj.word.length) {
      checkGuessLocal();
    }
  }
});

// Listener per il tasto Invio (per entrambe le modalità)
guessInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (onlineMode) {
      checkGuessOnline();
    } else {
      checkGuessLocal();
    }
  }
});

function checkGuessLocal() {
  const guess = guessInput.value.trim().toLowerCase();
  if (guess === "") return;
  if (guess === currentWordObj.word.toLowerCase()) {
    clearInterval(timerInterval);
    clearInterval(letterRevealInterval);
    resultDiv.innerText = "Corretto!";
    setTimeout(() => {
      nextTurnLocal();
    }, 1500);
  } else {
    resultDiv.innerText = "Sbagliato!";
  }
}

function nextTurnLocal() {
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  showTurnTransition(players[currentPlayerIndex].name, startTurnLocal);
}

function gameOverLocal() {
  clearInterval(timerInterval);
  clearInterval(letterRevealInterval);
  document.getElementById('endGameControls').classList.remove('hidden');
  guessInput.disabled = true;
}

function togglePause() {
  if (!localGamePaused) {
    localGamePaused = true;
    pauseBtn.innerText = "Riprendi";
    clearInterval(timerInterval);
    clearInterval(letterRevealInterval);
  } else {
    localGamePaused = false;
    pauseBtn.innerText = "Pausa";
    startTimerLocal();
    startLetterRevealLocal();
  }
}
pauseBtn.addEventListener('click', togglePause);

restartBtn.addEventListener('click', () => {
  if (!onlineMode) {
    players.forEach(p => p.remainingTime = chosenTimerDuration);
    currentPlayerIndex = 0;
    resultDiv.innerText = "";
    hideEndGameControls();
    showTurnTransition(players[currentPlayerIndex].name, startTurnLocal);
  } else {
    socket.emit('rematch');
    resultDiv.innerText = "In attesa dell'avversario per la rivincita...";
    document.getElementById('endGameControls').classList.add('hidden');
  }
});

menuBtn.addEventListener('click', () => {
  if (onlineMode && socket) {
    socket.disconnect();
    socket = null;
  }
  clearInterval(timerInterval);
  clearInterval(letterRevealInterval);
  gameAreaDiv.classList.add('hidden');
  menuDiv.classList.remove('hidden');
});

// Riconoscimento vocale (per entrambe le modalità)
function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Il tuo browser non supporta il riconoscimento vocale.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = 'it-IT';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();
  recognition.onresult = (event) => {
    const voiceResult = event.results[0][0].transcript;
    guessInput.value = voiceResult;
    if (onlineMode) {
      checkGuessOnline();
    } else {
      checkGuessLocal();
    }
  };
  recognition.onerror = (event) => {
    console.error("Errore nel riconoscimento vocale:", event.error);
  };
}
startVoiceBtn.addEventListener('click', startVoiceRecognition);

// --- Modalità Online ---
// La logica (timer, rivelazione, controllo risposta e turni) è gestita dal server.
function initOnlineGame() {
  onlineMode = true;
  pauseBtn.classList.add('hidden');
  socket = io();
  
  // Invia il nome utente al server
  socket.emit('joinGame', { username: currentUser.username });

  socket.on('waiting', (data) => {
    onlineStatusDiv.innerText = data.message;
  });

  socket.on('gameStart', (data) => {
    onlineGameSetupDiv.classList.add('hidden');
    gameAreaDiv.classList.remove('hidden');
    turnInfoDiv.innerText = "In attesa del turno...";
    chosenTimerDuration = data.timerDuration;
    // Salva i nomi utente per riferimento
    window.playerUsernames = data.playerUsernames;
  });

  socket.on('turnStart', (data) => {
    if (socket.id === data.activePlayer) {
      turnInfoDiv.innerText = "Il tuo turno!";
      guessInput.disabled = false;
    } else {
      turnInfoDiv.innerText = `Turno di ${data.activePlayerUsername}`;
      guessInput.disabled = true;
    }
    
    // Mostra l'animazione di transizione con il nome del giocatore attivo
    showOnlineTurnTransition(data.activePlayerUsername || "Avversario", () => {
      definitionDiv.innerText = `Definizione: ${data.definition}`;
      wordDisplayDiv.innerText = data.displayedWord;
      timerDiv.innerText = `Tempo: ${data.timer}s`;
      resultDiv.innerText = "";
      guessInput.value = "";
      onlineWordLength = data.displayedWord.split(" ").length;
      updateOnlineTimers(data.remainingTimes, data.playerUsernames);
    });
  });

  socket.on('updateTimer', (data) => {
    timerDiv.innerText = `Tempo: ${data.timer}s`;
    updateOnlineTimers(data.remainingTimes);
  });

  socket.on('updateWord', (data) => {
    wordDisplayDiv.innerText = data.displayedWord;
  });

  socket.on('guessResult', (data) => {
    if (data.correct) {
      resultDiv.innerText = (socket.id === data.activePlayer) ? "Corretto!" : `L'avversario ha indovinato con "${data.guess}"!`;
      guessInput.disabled = true;
    } else {
      if (socket.id === data.activePlayer) {
        resultDiv.innerText = "Sbagliato!";
      }
    }
  });

  socket.on('timeUp', (data) => {
    resultDiv.innerText = "Tempo scaduto!";
    guessInput.disabled = true;
  });

  socket.on('gameOver', (data) => {
    if (data.message) {
      resultDiv.innerText = data.message;
    } else {
      resultDiv.innerText = (socket.id === data.winner) ? "Hai vinto!" : "Hai perso!";
    }
    guessInput.disabled = true;
    document.getElementById('endGameControls').classList.remove('hidden');
  });

  socket.on('rematchStart', (data) => {
    resultDiv.innerText = data.message;
  });

  socket.on('opponentDisconnected', (data) => {
    resultDiv.innerText = data.message;
    guessInput.disabled = true;
  });
}

function checkGuessOnline() {
  const guess = guessInput.value.trim();
  if (guess === "") return;
  socket.emit('playerGuess', { guess: guess });
}

// Funzione per mostrare l'animazione di transizione del turno in modalità online
function showOnlineTurnTransition(playerName, callback) {
  turnTransitionDiv.innerText = `Turno di ${playerName}`;
  turnTransitionDiv.classList.remove('hidden');
  turnTransitionDiv.style.animation = 'slideInOut 1.5s forwards';
  setTimeout(() => {
    turnTransitionDiv.classList.add('hidden');
    turnTransitionDiv.style.animation = '';
    if (callback) callback();
  }, 1500);
}

function updateOnlineTimers(remainingTimes, playerUsernames = window.playerUsernames) {
  let html = "<strong>Timer dei giocatori:</strong><br>";
  for (const [id, time] of Object.entries(remainingTimes)) {
    const username = playerUsernames && playerUsernames[id] ? playerUsernames[id] : (id === socket.id ? "Tu" : "Avversario");
    if (id === socket.id) {
      html += `<span style="color:#ffd700;">${username}: ${time}s</span><br>`;
    } else {
      html += `${username}: ${time}s<br>`;
    }
  }
  playersTimersDiv.innerHTML = html;
}

function hideEndGameControls() {
  document.getElementById('endGameControls').classList.add('hidden');
}
