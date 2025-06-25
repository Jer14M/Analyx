const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const PORT = process.env.PORT || 3000;
const { initializeGoogleSheets, findUser, addUser, verifyUser, getUserLoginCount } = require('./google-sheets-api');

// Middleware per il parsing del JSON
app.use(express.json());

// Serviamo i file statici dalla cartella "public"
app.use(express.static("public"));

// Inizializza la connessione a Google Sheets all'avvio del server
(async () => {
  await initializeGoogleSheets();
})();

// API per il login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username e password sono richiesti' });
    }

    // Verifica le credenziali
    const isValid = await verifyUser(username, password);

    if (isValid) {
      // Ottieni il numero di accessi dopo l'incremento
      const loginCount = await getUserLoginCount(username);
      return res.json({ success: true, username, loginCount });
    } else {
      return res.status(401).json({ success: false, message: 'Username o password non validi' });
    }
  } catch (error) {
    console.error('Errore durante il login:', error);
    res.status(500).json({ success: false, message: 'Errore del server' });
  }
});

// API per la registrazione
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username e password sono richiesti' });
    }

    // Verifica che Google Sheets sia stato inizializzato
    if (!await initializeGoogleSheets()) {
      console.error('Impossibile inizializzare Google Sheets per la registrazione');
      return res.status(500).json({ success: false, message: 'Errore di connessione con il database' });
    }

    // Controlla se l'utente esiste già
    const existingUser = await findUser(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username già in uso' });
    }

    // Registra il nuovo utente
    const success = await addUser(username, password);

    if (success) {
      return res.json({ success: true, message: 'Registrazione completata con successo' });
    } else {
      return res.status(500).json({ success: false, message: 'Errore durante la registrazione' });
    }
  } catch (error) {
    console.error('Errore durante la registrazione:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ success: false, message: 'Errore del server: ' + error.message });
  }
});

// Reindirizza al login se l'utente accede alla root e non è già su login.html
app.get('/', (req, res, next) => {
  // Se la richiesta è per l'API o per i file statici, continua
  if (req.path.startsWith('/api/') || req.path.endsWith('.js') || req.path.endsWith('.css')) {
    return next();
  }

  // Continua con la richiesta normalmente, il controllo dell'autenticazione avverrà lato client
  next();
});

// Lista di parole per la modalità online
const words = [
  {
    word: "astronomia",
    definition: "Scienza che studia gli astri e l'universo.",
  },
  {
    word: "magnetismo",
    definition: "Proprietà dei materiali di attirare il ferro.",
  },
  {
    word: "biodiversità",
    definition: "Varietà di specie viventi in un ecosistema.",
  },
  {
    word: "filosofia",
    definition: "Disciplina che studia il pensiero e l'esistenza.",
  },
  {
    word: "acceleratore",
    definition: "Dispositivo che aumenta la velocità delle particelle.",
  },
  {
    word: "cartografia",
    definition: "Arte e scienza di realizzare mappe geografiche.",
  },
  {
    word: "dinamo",
    definition: "Macchina che trasforma energia meccanica in elettrica.",
  },
  {
    word: "epoca",
    definition: "Periodo storico contraddistinto da eventi o culture.",
  },
  {
    word: "fotone",
    definition: "Particella elementare portatrice della luce.",
  },
  { word: "geyser", definition: "Sorgente termale che erutta acqua calda." },
  {
    word: "idrogeno",
    definition: "Elemento chimico più leggero e abbondante.",
  },
  {
    word: "karma",
    definition: "Concetto filosofico legato alle azioni e alle conseguenze.",
  },
  { word: "litosfera", definition: "Strato esterno solido della Terra." },
  {
    word: "mimicria",
    definition: "Adattamento di una specie per imitarne un'altra.",
  },
  { word: "narrativa", definition: "Genere letterario basato sulla prosa." },
  { word: "ozono", definition: "Gas che protegge la Terra dai raggi UV." },
  {
    word: "paleontologia",
    definition: "Studio dei fossili e degli organismi antichi.",
  },
  { word: "quasar", definition: "Oggetto astronomico luminoso e distante." },
  { word: "risonanza", definition: "Amplificazione di un suono o vibrazione." },
  { word: "simbiosi", definition: "Relazione mutualistica tra due organismi." },
  { word: "telescopio", definition: "Strumento per osservare corpi celesti." },
  { word: "utopia", definition: "Società ideale ma irrealizzabile." },
  {
    word: "vulcanologia",
    definition: "Studio dei vulcani e dei fenomeni eruttivi.",
  },
  {
    word: "web",
    definition: "Rete globale di documenti collegati via internet.",
  },
  { word: "xenon", definition: "Gas nobile usato in lampade e propulsori." },
  { word: "yoga", definition: "Pratica fisica e mentale di origine indiana." },
  { word: "zoologia", definition: "Studio scientifico degli animali." },
  {
    word: "arcobaleno",
    definition: "Fenomeno ottico con bande colorate nel cielo.",
  },
  {
    word: "bioma",
    definition: "Insieme di ecosistemi caratteristici di una zona.",
  },
  { word: "cronologia", definition: "Sequenza temporale di eventi storici." },
  {
    word: "digestione",
    definition: "Processo di scomposizione del cibo nel corpo.",
  },
  { word: "embrione", definition: "Organismo nelle prime fasi di sviluppo." },
  { word: "faglia", definition: "Frattura nella crosta terrestre." },
  { word: "gastronomia", definition: "Arte della preparazione del cibo." },
  { word: "habitat", definition: "Ambiente naturale di una specie." },
  { word: "infinito", definition: "Concetto di qualcosa senza limiti o fine." },
  {
    word: "jazz",
    definition: "Genere musicale nato dalla cultura afroamericana.",
  },
  { word: "kayak", definition: "Piccola imbarcazione a remi." },
  { word: "laser", definition: "Dispositivo che emette luce coerente." },
  { word: "mitosi", definition: "Processo di divisione cellulare." },
  { word: "nebulosa", definition: "Nube di gas e polvere nello spazio." },
  { word: "orografia", definition: "Descrizione delle catene montuose." },
  {
    word: "pandemia",
    definition: "Epidemia diffusa su vasta scala geografica.",
  },
  {
    word: "quantistica",
    definition: "Teoria fisica che studia le particelle subatomiche.",
  },
  { word: "radar", definition: "Sistema di rilevamento tramite onde radio." },
  { word: "sismografo", definition: "Strumento che registra i terremoti." },
  { word: "traslazione", definition: "Movimento orbitale di un pianeta." },
  {
    word: "unicorno",
    definition: "Creatura mitologica con un corno frontale.",
  },
  { word: "vegetazione", definition: "Insieme delle piante di un'area." },
  { word: "wifi", definition: "Tecnologia per reti wireless locali." },
  { word: "zolfo", definition: "Elemento chimico giallo e non metallico." },
  {
    word: "aureola",
    definition: "Cerchio luminoso attorno alla testa nelle icone religiose.",
  },
  {
    word: "batteria",
    definition: "Dispositivo che immagazzina energia elettrica.",
  },
  {
    word: "ciclone",
    definition: "Sistema atmosferico con venti rotanti intensi.",
  },
  { word: "diamante", definition: "Carbonio cristallizzato, pietra preziosa." },
  { word: "eolico", definition: "Energia prodotta dal vento." },
  {
    word: "fotovoltaico",
    definition: "Conversione della luce solare in elettricità.",
  },
  {
    word: "glaciale",
    definition: "Relativo ai ghiacciai o alle ere glaciali.",
  },
  { word: "ibrido", definition: "Organismo nato dall'incrocio di due specie." },
  {
    word: "jolly",
    definition: "Carta o elemento che sostituisce altri valori.",
  },
  { word: "kangaroo", definition: "Marsupiale australiano saltatore." },
  { word: "lava", definition: "Roccia fusa eruttata da un vulcano." },
  {
    word: "magnetar",
    definition: "Stella di neutroni con campo magnetico intenso.",
  },
  {
    word: "nirvana",
    definition: "Stato di liberazione spirituale nel buddismo.",
  },
  { word: "ottica", definition: "Branca della fisica che studia la luce." },
  { word: "pixel", definition: "Unità minima di un'immagine digitale." },
  {
    word: "quokka",
    definition: "Piccolo marsupiale australiano noto per il sorriso.",
  },
  { word: "rete", definition: "Insieme interconnesso di elementi o nodi." },
  {
    word: "sostenibilità",
    definition: "Utilizzo responsabile delle risorse naturali.",
  },
  { word: "tundra", definition: "Bioma polare con terreno ghiacciato." },
  {
    word: "ultrasuono",
    definition: "Onda acustica con frequenza oltre l'udibile.",
  },
  {
    word: "velocità",
    definition: "Grandezza fisica che misura spazio percorso nel tempo.",
  },
  { word: "wirless", definition: "Tecnologia di trasmissione senza cavi." },
  { word: "xilografia", definition: "Tecnica di stampa con matrici di legno." },
  { word: "yogurt", definition: "Alimento fermentato derivato dal latte." },
  {
    word: "zanzara",
    definition: "Insetto noto per pungere e trasmettere malattie.",
  },
  {
    word: "alchimia",
    definition: "Antica pratica protoscientifica e filosofica.",
  },
  { word: "balena", definition: "Grande mammifero marino." },
  { word: "cristallo", definition: "Solido con struttura atomica ordinata." },
  { word: "droni", definition: "Aeromobili a pilotaggio remoto." },
  { word: "eclittica", definition: "Percorso apparente del Sole nel cielo." },
  { word: "fotocamera", definition: "Dispositivo per catturare immagini." },
  {
    word: "grafene",
    definition:
      "Materiale costituito da un singolo strato di atomi di carbonio.",
  },
  {
    word: "hacker",
    definition: "Esperto informatico che supera sistemi di sicurezza.",
  },
  {
    word: "intelligenza",
    definition: "Capacità di apprendere e risolvere problemi.",
  },
  {
    word: "jalapeno",
    definition: "Peperoncino piccante originario del Messico.",
  },
  { word: "ketchup", definition: "Salsa a base di pomodoro e aceto." },
  { word: "lucertola", definition: "Rettile piccolo e agile con coda lunga." },
  {
    word: "metamorfosi",
    definition: "Trasformazione fisica durante lo sviluppo.",
  },
  { word: "narratore", definition: "Voce che racconta una storia." },
  { word: "orologio", definition: "Strumento per misurare il tempo." },
  {
    word: "paradosso",
    definition: "Affermazione che contraddice il senso comune.",
  },
  {
    word: "quadrante",
    definition: "Parte di un orologio che mostra i numeri.",
  },
  {
    word: "ribosoma",
    definition: "Organello cellulare che sintetizza proteine.",
  },
  {
    word: "solare",
    definition: "Relativo al Sole o all'energia da esso derivata.",
  },
  {
    word: "teorema",
    definition: "Proposizione dimostrata tramite ragionamento logico.",
  },
  { word: "unicità", definition: "Qualità di ciò che è unico e irripetibile." },
  { word: "valanga", definition: "Massa di neve che precipita da un pendio." },
  { word: "webcam", definition: "Telecamera collegata a un computer." },
  { word: "xenofobia", definition: "Paura o avversione verso gli stranieri." },
  { word: "yacht", definition: "Imbarcazione di lusso a motore o vela." },
  {
    word: "zucchero",
    definition: "Sostanza dolce derivata dalla canna o barbabietola.",
  },
  { word: "arcipelago", definition: "Gruppo di isole vicine tra loro." },
  {
    word: "biodegradabile",
    definition: "Materiale che si decompone naturalmente.",
  },
  { word: "crisalide", definition: "Stadio intermedio tra larva e farfalla." },
  { word: "dittatore", definition: "Leader politico con potere assoluto." },
  {
    word: "eclisse",
    definition: "Oscuramento temporaneo di un corpo celeste.",
  },
  { word: "fototropismo", definition: "Movimento delle piante verso la luce." },
  {
    word: "gravità",
    definition: "Forza che attrae i corpi verso un centro di massa.",
  },
  { word: "idrosfera", definition: "Insieme delle acque sulla Terra." },
  { word: "jalousie", definition: "Persiana con lamelle orientabili." },
  { word: "kermesse", definition: "Evento pubblico di grande richiamo." },
  { word: "litosfera", definition: "Strato esterno rigido della Terra." },
  {
    word: "computer",
    definition: "Dispositivo elettronico per l'elaborazione dei dati.",
  },
  {
    word: "albero",
    definition: "Pianta perenne con un tronco legnoso e rami.",
  },
  {
    word: "ossigeno",
    definition: "Elemento chimico essenziale per la respirazione.",
  },
  {
    word: "sinapsi",
    definition: "Comunicazione tra neuroni nel sistema nervoso.",
  },
  {
    word: "eclissi",
    definition: "Allineamento astronomico che oscura un corpo celeste.",
  },
  {
    word: "fotosintesi",
    definition: "Processo attraverso cui le piante producono glucosio.",
  },
  {
    word: "algoritmo",
    definition: "Sequenza logica di passaggi per risolvere un problema.",
  },
  { word: "biosfera", definition: "Insieme degli ecosistemi della Terra." },
  {
    word: "quantum",
    definition: "Unità minima di energia nella fisica quantistica.",
  },
  { word: "galassia", definition: "Sistema stellare legato dalla gravità." },
  {
    word: "teorema",
    definition: "Proposizione matematica dimostrabile logicamente.",
  },
  {
    word: "antropologia",
    definition: "Studio scientifico dell'uomo e delle società.",
  },
  {
    word: "ecosistema",
    definition: "Insieme di organismi e ambiente in cui vivono.",
  },
  {
    word: "filantropia",
    definition: "Amore per l'umanità, espresso con atti generosi.",
  },
  { word: "batterio", definition: "Microrganismo unicellulare procariote." },
  {
    word: "democrazia",
    definition: "Sistema di governo basato sul potere del popolo.",
  },
  { word: "cinetica", definition: "Ramodella fisica che studia il movimento." },
  {
    word: "icona",
    definition: "Immagine simbolica con valore religioso o culturale.",
  },
  {
    word: "zenith",
    definition: "Punto più alto nel cielo rispetto a un osservatore.",
  },
  {
    word: "xilofono",
    definition: "Strumento musicale a percussione con lamelle di legno.",
  },
];

let waitingPlayer = null;
const games = {}; // Oggetti di gioco, chiave: nome stanza

io.on("connection", (socket) => {
  console.log("Un utente si è connesso: " + socket.id);

  // Inijetta il player ID così il client può conoscere il proprio ID
  socket.on("joinGame", (data) => {
    const username = data.username || "Giocatore Anonimo";
    socket.username = username;

    if (waitingPlayer) {
      // Crea una stanza con i due giocatori
      const room = "room-" + waitingPlayer.id + "-" + socket.id;
      waitingPlayer.join(room);
      socket.join(room);
      const timerDuration = 45; // durata iniziale per ogni giocatore
      const game = {
        room: room,
        players: [waitingPlayer.id, socket.id],
        playerUsernames: {
          [waitingPlayer.id]: waitingPlayer.username,
          [socket.id]: username
        },
        currentTurn: waitingPlayer.id, // il primo turno va al giocatore in attesa
        timerDuration: timerDuration,
        timer: timerDuration,
        word: "",
        definition: "",
        revealedIndexes: [],
        timerInterval: null,
        letterRevealInterval: null,
        remainingTimes: {},
        rematch: {},
      };
      // Inizializza i timer per entrambi i giocatori
      game.remainingTimes[waitingPlayer.id] = timerDuration;
      game.remainingTimes[socket.id] = timerDuration;
      games[room] = game;
      io.to(room).emit("gameStart", {
        room: room,
        players: game.players,
        playerUsernames: game.playerUsernames,
        timerDuration: timerDuration,
      });
      startTurn(game);
      waitingPlayer = null;
    } else {
      waitingPlayer = socket;
      socket.emit("waiting", { message: "In attesa di un avversario..." });
    }
  });

  socket.on("playerGuess", (data) => {
    // Recupera la stanza di appartenenza usando Array.from (socket.rooms è una Set)
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    if (rooms.length === 0) return;
    const room = rooms[0];
    const game = games[room];
    if (!game) return;
    // Solo il giocatore di turno può rispondere
    if (socket.id !== game.currentTurn) return;
    const guess = data.guess.trim().toLowerCase();
    if (guess === game.word.toLowerCase()) {
      clearInterval(game.timerInterval);
      clearInterval(game.letterRevealInterval);
      // Aggiorna il tempo residuo per il giocatore di turno
      game.remainingTimes[game.currentTurn] = game.timer;
      io.to(game.room).emit("guessResult", {
        guess: guess,
        correct: true,
        activePlayer: socket.id,
      });
      setTimeout(() => {
        // Se l'avversario ha ancora tempo, passa il turno; altrimenti il giocatore attivo vince
        const opponent =
          game.currentTurn === game.players[0]
            ? game.players[1]
            : game.players[0];
        if (game.remainingTimes[opponent] <= 0) {
          io.to(game.room).emit("gameOver", { winner: socket.id });
        } else {
          nextTurn(game);
        }
      }, 1500);
    } else {
      // Risposta errata: notifica il giocatore attivo
      socket.emit("guessResult", {
        guess: guess,
        correct: false,
        activePlayer: socket.id,
      });
    }
  });

  socket.on("rematch", () => {
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    if (rooms.length === 0) return;
    const room = rooms[0];
    const game = games[room];
    if (!game) return;
    game.rematch = game.rematch || {};
    game.rematch[socket.id] = true;
    // Se entrambi i giocatori richiedono la rivincita, resetta lo stato della partita
    if (game.rematch[game.players[0]] && game.rematch[game.players[1]]) {
      game.remainingTimes[game.players[0]] = game.timerDuration;
      game.remainingTimes[game.players[1]] = game.timerDuration;
      game.rematch = {};
      // Il turno iniziale viene scelto casualmente
      game.currentTurn = game.players[Math.floor(Math.random() * 2)];
      io.to(game.room).emit("rematchStart", {
        message: "La partita ricomincia!",
      });
      startTurn(game);
    }
  });

  socket.on("disconnect", () => {
    console.log("Un utente si è disconnesso: " + socket.id);
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
    // Se un giocatore in partita si disconnette, dichiara vincitore l'altro
    for (let room in games) {
      const game = games[room];
      if (game.players.includes(socket.id)) {
        clearInterval(game.timerInterval);
        clearInterval(game.letterRevealInterval);
        const opponent = game.players.find((id) => id !== socket.id);
        io.to(room).emit("gameOver", {
          winner: opponent,
          message: "Il tuo avversario si è disconnesso. Hai vinto a tavolino!",
        });
        delete games[room];
      }
    }
  });
});

function startTurn(game) {
  // Seleziona una parola casuale
  const randomIndex = Math.floor(Math.random() * words.length);
  const chosen = words[randomIndex];
  game.word = chosen.word;
  game.definition = chosen.definition;
  // Imposta il timer del turno come il tempo residuo del giocatore di turno
  game.timer = game.remainingTimes[game.currentTurn];
  game.revealedIndexes = [0]; // La prima lettera è sempre visibile
  const displayedWord = computeDisplayedWord(game.word, game.revealedIndexes);
  io.to(game.room).emit("turnStart", {
    activePlayer: game.currentTurn,
    activePlayerUsername: game.playerUsernames[game.currentTurn], // Passare esplicitamente l'username del giocatore attivo
    playerUsernames: game.playerUsernames, // Include tutti gli usernames
    definition: game.definition,
    displayedWord: displayedWord,
    timer: game.timer,
    remainingTimes: game.remainingTimes,
  });
  // Countdown del timer
  game.timerInterval = setInterval(() => {
    game.timer--;
    io.to(game.room).emit("updateTimer", {
      timer: game.timer,
      remainingTimes: game.remainingTimes,
    });
    if (game.timer <= 0) {
      clearInterval(game.timerInterval);
      clearInterval(game.letterRevealInterval);
      game.remainingTimes[game.currentTurn] = 0;
      const winner =
        game.currentTurn === game.players[0]
          ? game.players[1]
          : game.players[0];
      io.to(game.room).emit("gameOver", { winner: winner });
    }
  }, 1000);
  // Rivelazione graduale delle lettere
  game.letterRevealInterval = setInterval(() => {
    const unrevealed = [];
    for (let i = 1; i < game.word.length; i++) {
      if (!game.revealedIndexes.includes(i)) {
        unrevealed.push(i);
      }
    }
    if (unrevealed.length <= 1) {
      clearInterval(game.letterRevealInterval);
      return;
    }
    const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    game.revealedIndexes.push(randomIdx);
    const newDisplayed = computeDisplayedWord(game.word, game.revealedIndexes);
    io.to(game.room).emit("updateWord", { displayedWord: newDisplayed });
  }, 2000);
}

function nextTurn(game) {
  clearInterval(game.timerInterval);
  clearInterval(game.letterRevealInterval);
  // Alterna il turno tra i due giocatori
  game.currentTurn =
    game.currentTurn === game.players[0] ? game.players[1] : game.players[0];
  if (game.remainingTimes[game.currentTurn] <= 0) {
    const winner =
      game.currentTurn === game.players[0] ? game.players[1] : game.players[0];
    io.to(game.room).emit("gameOver", { winner: winner });
  } else {
    startTurn(game);
  }
}

function computeDisplayedWord(word, revealedIndexes) {
  let result = "";
  for (let i = 0; i < word.length; i++) {
    result += (revealedIndexes.includes(i) ? word[i] : "_") + " ";
  }
  return result.trim();
}

http.listen(PORT, () => {
  console.log("Server in ascolto sulla porta: " + PORT);
});