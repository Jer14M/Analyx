const { GoogleSpreadsheet } = require('google-spreadsheet');
const bcrypt = require('bcryptjs');

// Configurazione delle credenziali per Google Sheets
// Assicurati di creare queste variabili nel file .env o nel pannello Secrets di Replit
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
// Prova diversi metodi per formattare correttamente la chiave privata
let GOOGLE_PRIVATE_KEY;
try {
  // Elenco di tutte le variabili d'ambiente disponibili (senza valori, per sicurezza)
  console.log('Elenco delle variabili d\'ambiente disponibili:');
  console.log(Object.keys(process.env));

  GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

  // Controllo se la variabile è definita
  if (!GOOGLE_PRIVATE_KEY) {
    console.error('ERRORE CRITICO: GOOGLE_PRIVATE_KEY non è definita nelle variabili d\'ambiente');
    // Tentativo di recuperare altre variabili correlate che potrebbero esistere
    const possibleKeys = Object.keys(process.env).filter(key => 
      key.includes('KEY') || key.includes('GOOGLE') || key.includes('SHEETS')
    );
    console.log('Possibili chiavi alternative trovate:', possibleKeys);
    throw new Error('Variabile GOOGLE_PRIVATE_KEY mancante');
  }

  console.log('Tipo di GOOGLE_PRIVATE_KEY:', typeof GOOGLE_PRIVATE_KEY);
  console.log('Lunghezza GOOGLE_PRIVATE_KEY:', GOOGLE_PRIVATE_KEY.length);

  // Metodo 1: sostituisci \n con nuove righe reali
  if (GOOGLE_PRIVATE_KEY.includes('\\n')) {
    GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    console.log('Applicato Metodo 1: Sostituzione di \\n con newline');
  }

  // Metodo 2: assicurati che ci siano nuove righe dopo i delimitatori
  if (!GOOGLE_PRIVATE_KEY.includes('-----BEGIN PRIVATE KEY-----\n')) {
    GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY
      .replace(/-----BEGIN PRIVATE KEY-----/g, '-----BEGIN PRIVATE KEY-----\n')
      .replace(/-----END PRIVATE KEY-----/g, '\n-----END PRIVATE KEY-----');
    console.log('Applicato Metodo 2: Aggiunta di newline ai delimitatori della chiave');
  }

  // Metodo 3: rimuovi eventuali virgolette superflue
  if (GOOGLE_PRIVATE_KEY.startsWith('"') && GOOGLE_PRIVATE_KEY.endsWith('"')) {
    GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY.slice(1, -1);
    console.log('Applicato Metodo 3: Rimozione delle virgolette');
  }

  // Metodo 4: sostituisci doppie virgolette di escape
  if (GOOGLE_PRIVATE_KEY.includes('\\"')) {
    GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY.replace(/\\"/g, '"');
    console.log('Applicato Metodo 4: Sostituzione di doppie virgolette escapate');
  }

  // Log di debug per vedere come appare la chiave
  console.log('Primi 15 caratteri della chiave:', GOOGLE_PRIVATE_KEY.substring(0, 15));
  console.log('Ultimi 15 caratteri della chiave:', GOOGLE_PRIVATE_KEY.substring(GOOGLE_PRIVATE_KEY.length - 15));
  console.log('La chiave contiene delimitatori BEGIN:', GOOGLE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY'));
  console.log('La chiave contiene delimitatori END:', GOOGLE_PRIVATE_KEY.includes('END PRIVATE KEY'));

  console.log('Formato chiave privata processato completamente');
} catch (err) {
  console.error('Errore nel processare la chiave privata:', err);
  GOOGLE_PRIVATE_KEY = '';
}

let doc;
let sheet;

async function initializeGoogleSheets() {
  try {
    console.log('===== INIZIALIZZAZIONE GOOGLE SHEETS =====');

    // Verifica se le variabili di ambiente sono definite
    if (!SPREADSHEET_ID) {
      console.error('ERRORE CRITICO: SPREADSHEET_ID non definito nelle variabili d\'ambiente');
      return false;
    }
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.error('ERRORE CRITICO: GOOGLE_SERVICE_ACCOUNT_EMAIL non definito nelle variabili d\'ambiente');
      return false;
    }
    if (!GOOGLE_PRIVATE_KEY) {
      console.error('ERRORE CRITICO: GOOGLE_PRIVATE_KEY non definito nelle variabili d\'ambiente');
      return false;
    }

    console.log('SPREADSHEET_ID:', SPREADSHEET_ID);
    console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL:', GOOGLE_SERVICE_ACCOUNT_EMAIL);

    // Controlla se la chiave privata contiene BEGIN PRIVATE KEY e END PRIVATE KEY
    const hasBeginKey = GOOGLE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY');
    const hasEndKey = GOOGLE_PRIVATE_KEY.includes('END PRIVATE KEY');
    console.log('Chiave privata contiene BEGIN PRIVATE KEY:', hasBeginKey);
    console.log('Chiave privata contiene END PRIVATE KEY:', hasEndKey);

    // Stampa la lunghezza della chiave per verificare che sia valida
    console.log('Lunghezza della chiave privata:', GOOGLE_PRIVATE_KEY.length);

    console.log('Creazione dell\'istanza GoogleSpreadsheet...');
    doc = new GoogleSpreadsheet(SPREADSHEET_ID);

    console.log('Tentativo di autenticazione...');

    // Array di possibili formati della chiave da tentare
    const keyFormats = [
      // 1. Chiave corrente processata
      GOOGLE_PRIVATE_KEY,
      // 2. Chiave originale senza modifiche
      process.env.GOOGLE_PRIVATE_KEY,
      // 3. Chiave con escape aggiuntivo
      GOOGLE_PRIVATE_KEY.replace(/\n/g, '\\n'),
      // 4. Chiave con ulteriore formattazione per JSON
      JSON.stringify(GOOGLE_PRIVATE_KEY).slice(1, -1)
    ];

    let authenticated = false;
    let lastError = null;

    // Controlla la versione della biblioteca google-spreadsheet
    console.log('Versione Google Spreadsheet API:', doc.constructor.name);
    
    // Prova tutti i formati di chiave
    for (let i = 0; i < keyFormats.length; i++) {
      const keyFormat = keyFormats[i];
      if (!keyFormat) continue;

      try {
        console.log(`Tentativo di autenticazione #${i+1}...`);
        
        // Adatta il metodo di autenticazione alla versione 4.x di google-spreadsheet
        await doc.useServiceAccountAuth({
          client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: keyFormat,
        });
        
        console.log(`Autenticazione riuscita con il formato di chiave #${i+1}`);
        authenticated = true;
        break;
      } catch (authError) {
        console.error(`Tentativo di autenticazione #${i+1} fallito:`, authError.message);
        lastError = authError;
      }
    }

    if (!authenticated) {
      console.error('Tutti i tentativi di autenticazione sono falliti. Ultimo errore:', lastError);
      throw new Error('Impossibile autenticarsi: ' + (lastError ? lastError.message : 'errore sconosciuto'));
    }

    console.log('Caricamento informazioni documento...');
    try {
      await doc.loadInfo();
      console.log('Documento caricato con successo!');
      console.log('Titolo documento:', doc.title);
      console.log('Numero di fogli:', doc.sheetCount);
    } catch (loadError) {
      console.error('Errore nel caricamento del documento:', loadError.message);
      throw loadError;
    }

    // Ottieni o crea il foglio per gli utenti (supporta sia "users" che "Users")
    console.log('Cercando foglio "users" o "Users"...');

    try {
      // Stampa i nomi dei fogli disponibili per il debug
      const sheetTitles = Object.keys(doc.sheetsByTitle);
      console.log('Fogli disponibili:', sheetTitles);

      // Cerca il foglio con nome case-insensitive
      const userSheetName = sheetTitles.find(title => 
        title.toLowerCase() === 'users' || title.toLowerCase() === 'utenti'
      );

      if (userSheetName) {
        console.log('Foglio utenti trovato con nome:', userSheetName);
        sheet = doc.sheetsByTitle[userSheetName];
      } else {
        console.log('Foglio utenti non trovato, creazione di un nuovo foglio...');
        sheet = await doc.addSheet({ 
          title: 'Users', 
          headerValues: ['username', 'password'] 
        });
        console.log('Nuovo foglio "Users" creato con successo');
      }

      // Verifica che il foglio abbia le intestazioni giuste
      const headerRow = sheet.headerValues || await sheet.getRows({ limit: 1 }).then(rows => rows.length > 0 ? Object.keys(rows[0]) : []);
      console.log('Intestazioni del foglio:', headerRow);

      if (!headerRow.includes('username') || !headerRow.includes('password')) {
        console.warn('ATTENZIONE: Il foglio non ha le intestazioni corrette!');
        console.warn('Intestazioni attuali:', headerRow);
        console.warn('Intestazioni richieste: username, password');
      }
      
      // Aggiungi intestazione per il contatore accessi se non esiste
      if (!headerRow.includes('accessi')) {
        console.log('Aggiunta intestazione "accessi" al foglio...');
        // Se il foglio è vuoto o nuovo, imposta direttamente le intestazioni
        if (headerRow.length === 0) {
          await sheet.setHeaderRow(['username', 'password', 'accessi']);
        } else {
          // Altrimenti aggiungi la colonna all'intestazione esistente
          headerRow.push('accessi');
          await sheet.setHeaderRow(headerRow);
        }
        console.log('Intestazione "accessi" aggiunta con successo');
      }
    } catch (sheetError) {
      console.error('Errore nella ricerca/creazione del foglio:', sheetError.message);
      throw sheetError;
    }

    console.log('Google Sheets inizializzato con successo');
    return true;
  } catch (err) {
    console.error('Errore durante l\'inizializzazione di Google Sheets:', err.message);
    console.error('Stack trace:', err.stack);

    // Log dettagliato dell'errore completo
    console.error('Errore completo:', JSON.stringify(err, Object.getOwnPropertyNames(err)));

    // Verifica le credenziali
    console.error('Verifiche delle credenziali:');
    console.error('- SPREADSHEET_ID definito:', !!SPREADSHEET_ID);
    console.error('- GOOGLE_SERVICE_ACCOUNT_EMAIL definito:', !!GOOGLE_SERVICE_ACCOUNT_EMAIL);
    console.error('- GOOGLE_PRIVATE_KEY definito:', !!GOOGLE_PRIVATE_KEY);
    console.error('- Lunghezza SPREADSHEET_ID:', SPREADSHEET_ID ? SPREADSHEET_ID.length : 0);
    console.error('- Lunghezza GOOGLE_SERVICE_ACCOUNT_EMAIL:', GOOGLE_SERVICE_ACCOUNT_EMAIL ? GOOGLE_SERVICE_ACCOUNT_EMAIL.length : 0);
    console.error('- Lunghezza GOOGLE_PRIVATE_KEY:', GOOGLE_PRIVATE_KEY ? GOOGLE_PRIVATE_KEY.length : 0);

    return false;
  }
}

async function findUser(username) {
  try {
    await sheet.loadCells();
    const rows = await sheet.getRows({ limit: 100 });
    return rows.find(row => row.username === username);
  } catch (err) {
    console.error('Errore durante la ricerca dell\'utente:', err);
    return null;
  }
}

async function addUser(username, password) {
  try {
    // Verifica che l'inizializzazione di Google Sheets sia avvenuta correttamente
    if (!sheet) {
      console.error('Il foglio Google non è stato inizializzato correttamente');
      return false;
    }

    // Aggiungi utente al foglio con password in chiaro e inizializza il contatore accessi a 0
    await sheet.addRow({ username, password: password, accessi: '0' });

    console.log(`Utente '${username}' registrato con successo`);
    return true;
  } catch (err) {
    console.error('Errore durante l\'aggiunta dell\'utente:', err.message);
    console.error('Stack trace:', err.stack);
    return false;
  }
}

async function verifyUser(username, password) {
  try {
    const user = await findUser(username);
    if (!user) return false;

    // Confronto diretto delle password in chiaro
    const isValidPassword = password === user.password;
    
    // Se le credenziali sono valide, incrementa il contatore degli accessi
    if (isValidPassword) {
      await incrementLoginCounter(user);
    }
    
    return isValidPassword;
  } catch (err) {
    console.error('Errore durante la verifica dell\'utente:', err);
    return false;
  }
}

// Funzione per incrementare il contatore degli accessi
async function incrementLoginCounter(user) {
  try {
    // Se il campo accessi non esiste, inizializzalo a 0
    if (!user.accessi) {
      user.accessi = '0';
    }
    
    // Converti in numero, incrementa e riconverti in stringa
    const currentCount = parseInt(user.accessi) || 0;
    user.accessi = (currentCount + 1).toString();
    
    // Salva le modifiche
    await user.save();
    console.log(`Contatore accessi incrementato per l'utente ${user.username}: ${user.accessi}`);
    return true;
  } catch (err) {
    console.error(`Errore nell'incremento del contatore per l'utente ${user.username}:`, err);
    return false;
  }
}

// Funzione per ottenere il numero di accessi di un utente
async function getUserLoginCount(username) {
  try {
    const user = await findUser(username);
    if (!user) return null;
    
    return parseInt(user.accessi) || 0;
  } catch (err) {
    console.error('Errore nel recupero del contatore accessi:', err);
    return null;
  }
}

module.exports = {
  initializeGoogleSheets,
  findUser,
  addUser,
  verifyUser,
  getUserLoginCount
};